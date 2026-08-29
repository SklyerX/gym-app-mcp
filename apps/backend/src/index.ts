import "dotenv/config";

import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { env } from "./utils/env.js";

serve(
  {
    fetch: app.fetch,
    port: env.PORT || 3000,
  },
  (i) => {
    console.log(`Server is running on http://localhost:${i.port}`);
  },
);
