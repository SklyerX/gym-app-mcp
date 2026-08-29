import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tools } from "../tools/index.js";
import type { User } from "../utils/types.js";

export class ToolManager {
  private readonly server: McpServer;

  constructor(server: McpServer) {
    this.server = server;
  }

  registerTools(user: User) {
    for (const tool of tools) {
      this.server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: tool.input,
          annotations: tool.annotations,
        },
        (args) => tool.load(user, args),
      );
    }

    return tools.length;
  }
}
