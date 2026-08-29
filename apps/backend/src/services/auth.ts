import { type Redis } from "ioredis";
import type { db } from "../db/index.js";
import { createHash, randomBytes } from "node:crypto";
import { accounts, sessions, users } from "../db/schema.js";
import { nanoid } from "nanoid";
import { env } from "../utils/env.js";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class AuthError extends Error {
  readonly RETURNING_STATUS_CODE: ContentfulStatusCode;

  constructor(
    message: string,
    RETURNING_STATUS_CODE: ContentfulStatusCode = 500,
  ) {
    super(message);
    this.RETURNING_STATUS_CODE = RETURNING_STATUS_CODE;
  }
}

export class AuthClient {
  private readonly redis: Redis;
  private readonly db: typeof db;

  private readonly SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;

  constructor(props: { redis: Redis; db: typeof db }) {
    this.db = props.db;
    this.redis = props.redis;
  }

  private async createState(returnTo?: string) {
    const state = this.generateRandomString(16);

    await this.redis.set(
      `oauth:state:${state}`,
      JSON.stringify({ return_to: returnTo ?? null }),
      "EX",
      600,
    );

    return state;
  }

  private async consumeState(state: string) {
    const raw = await this.redis.get(`oauth:state:${state}`);

    if (!raw) throw new AuthError("Invalid or expired state", 400);

    await this.redis.del(`oauth:state:${state}`);

    try {
      const parsed = JSON.parse(raw) as { return_to: string | null };

      return parsed.return_to ?? undefined;
    } catch {
      return undefined;
    }
  }

  // Discord

  async generateDiscordAuthLink(returnTo?: string) {
    const state = await this.createState(returnTo);
    const scope = ["identify", "email", "guilds"];
    return `https://discord.com/oauth2/authorize?response_type=code&client_id=${env.DISCORD_CLIENT_ID}&scope=${scope.join("%20")}&state=${state}&redirect_uri=${env.DISCORD_REDIRECT_URI}&prompt=consent&integration_type=0`;
  }

  async handleDiscordCallback(code: string, state: string) {
    const returnTo = await this.consumeState(state);

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
    });

    const res = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${env.DISCORD_CLIENT_ID}:${env.DISCORD_CLIENT_SECRET}`,
          ).toString("base64"),
      },
      body,
    });

    if (!res.ok) throw new AuthError("Code exchange failed", 400);

    const data = await res.json();

    const session = await this.authorizeDiscordUser(
      data.access_token,
      data.refresh_token,
      data.expires_in * 1000,
    );

    return { ...session, returnTo };
  }

  private async authorizeDiscordUser(
    accessToken: string,
    refreshToken: string,
    expiry: number,
  ) {
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) throw new AuthError("Failed to fetch user information", 500);

    const data = await res.json();

    const email = data.email;
    const discord_userid = data.id;
    const username = data.username;
    const avatar = data.avatar;
    const expiresIn = new Date(Date.now() + expiry);

    let dbUser = await this.db.query.users.findFirst({
      where: {
        email: email,
      },
    });

    if (!dbUser) {
      await this.db.transaction(async (t) => {
        const [user] = await t
          .insert(users)
          .values({
            email,
            slug: nanoid(),
            username,
            avatarUrl: `https://cdn.discordapp.com/avatars/${discord_userid}/${avatar}.webp?size=1024`,
            isEmailVerified: true,
          })
          .returning();

        await t.insert(accounts).values({
          provider: "discord",
          userId: user.id,
          accessToken,
          refreshToken,
          expiresAt: expiresIn,
          providerAccountId: discord_userid,
        });

        dbUser = user;
      });
    } else {
      await this.db
        .insert(accounts)
        .values({
          provider: "discord",
          userId: dbUser.id,
          accessToken,
          refreshToken,
          expiresAt: expiresIn,
          providerAccountId: discord_userid,
        })
        .onConflictDoUpdate({
          target: [accounts.userId, accounts.provider],
          set: { accessToken, refreshToken, expiresAt: expiresIn },
        });
    }

    const { lu_hash, completeHash, display_key } = this.generateSession();

    await this.db.insert(sessions).values({
      expiresAt: new Date(Date.now() + this.SEVEN_DAYS_MS),
      luHash: lu_hash,
      token: completeHash,
      userId: dbUser!.id,
    });

    return { display_key, expiry: expiresIn };
  }

  private generateRandomString(length = 32) {
    return randomBytes(length).toString("hex");
  }

  private generateSession() {
    const raw = this.generateRandomString();
    const lu_hash = raw.slice(0, 8);
    const completeHash = createHash("sha256").update(raw).digest("hex");
    const display_key = `sess_${raw}`;

    return { lu_hash, completeHash, display_key };
  }
}
