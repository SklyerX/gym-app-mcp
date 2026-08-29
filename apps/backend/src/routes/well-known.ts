import { Hono } from "hono";
import { env } from "../utils/env.js";

const wellKnownRoutes = new Hono();

wellKnownRoutes.get("/oauth-protected-resource", async (c) => {
  return c.json({
    resource: `${env.HOSTED_API_URL}/mcp`,
    authorization_servers: [env.HOSTED_API_URL],
    bearer_methods_supported: ["header"],
  });
});

wellKnownRoutes.get("/oauth-authorization-server", async (c) => {
  return c.json({
    issuer: env.HOSTED_API_URL,
    authorization_endpoint: `${env.HOSTED_API_URL}/oauth/authorize`,
    token_endpoint: `${env.HOSTED_API_URL}/oauth/token`,
    registration_endpoint: `${env.HOSTED_API_URL}/oauth/register`,

    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],

    scopes_supported: ["mcp"],
  });
});

export default wellKnownRoutes;
