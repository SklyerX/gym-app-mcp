import { z } from "zod";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "ping",
  description:
    "Connectivity check. Echoes the message back with the authenticated user's id. Use only to verify the server is reachable — it reads and writes no workout data.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  input: {
    message: z.string().describe("Any string; it is echoed back verbatim."),
  },
  load: (user, { message }) => ({
    content: [
      {
        type: "text",
        text: `pong: ${message} (user: ${user.id.slice(0, 5)}...)`,
      },
    ],
  }),
});
