import { defineConfig } from "vitest/config";
import fs from "node:fs";

/* Wrangler's [[rules]] Text loader imports .txt files as strings; this
 * plugin gives vitest the same behaviour so src modules load unchanged. */
export default defineConfig({
  plugins: [
    {
      name: "wrangler-text-loader",
      enforce: "pre",
      load(id) {
        if (id.endsWith(".txt")) {
          return `export default ${JSON.stringify(fs.readFileSync(id, "utf8"))};`;
        }
      },
    },
  ],
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
