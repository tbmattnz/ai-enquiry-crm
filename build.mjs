import { build } from "esbuild";
await build({
  entryPoints: ["src/app.jsx"],
  bundle: true,
  minify: true,
  outfile: "docs/app.js",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "external",
});
