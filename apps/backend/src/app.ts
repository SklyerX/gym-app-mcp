import { Hono } from "hono";
import authRoutes from "./routes/auth.js";
import oauthRoutes from "./routes/oauth.js";
import wellKnownRoutes from "./routes/well-known.js";
import { mcpGate } from "./middleware/mcp-gate.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StreamableHTTPTransport } from "@hono/mcp";
import { ToolManager } from "./services/tool-manager.js";
import type { User } from "./utils/types.js";

export const app = new Hono();

app.route("/auth", authRoutes);
app.route("/oauth", oauthRoutes);
app.route("/.well-known", wellKnownRoutes);

app.all("/mcp", mcpGate, async (c) => {
  const user = c.get("user" as never) as User;

  // A server per request: the tools close over this user, so nothing is shared
  // between callers.
  const server = new McpServer({ name: "gym-mcp", version: "1.0.0" });

  new ToolManager(server).registerTools(user);

  const transport = new StreamableHTTPTransport();
  await server.connect(transport);

  return transport.handleRequest(c);
});
