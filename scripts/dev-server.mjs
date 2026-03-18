import { context } from "esbuild";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const outDir = path.join(rootDir, ".dev-build");

const getArgValue = (name, fallback) => {
  const idx = process.argv.findIndex((arg) => arg === name);
  if (idx === -1 || !process.argv[idx + 1]) return fallback;
  return process.argv[idx + 1];
};

const port = Number(getArgValue("--port", "8080"));

await fs.mkdir(outDir, { recursive: true });

const aliasPlugin = {
  name: "alias-at-src",
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => {
      return {
        path: path.join(rootDir, "src", args.path.slice(2)),
      };
    });
  },
};

const postcssPlugin = {
  name: "postcss-tailwind",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = await fs.readFile(args.path, "utf8");
      const result = await postcss([tailwindcss(), autoprefixer()]).process(css, {
        from: args.path,
      });

      return {
        contents: result.css,
        loader: "css",
      };
    });
  },
};

const ctx = await context({
  absWorkingDir: rootDir,
  entryPoints: [path.join(rootDir, "src/main.tsx")],
  outdir: outDir,
  bundle: true,
  format: "esm",
  splitting: true,
  sourcemap: true,
  entryNames: "[name]",
  assetNames: "assets/[name]-[hash]",
  loader: {
    ".png": "file",
    ".jpg": "file",
    ".jpeg": "file",
    ".svg": "file",
    ".gif": "file",
    ".webp": "file",
    ".woff": "file",
    ".woff2": "file",
    ".ttf": "file",
  },
  define: {
    "process.env.NODE_ENV": '"development"',
  },
  plugins: [aliasPlugin, postcssPlugin],
});

await ctx.watch();
await ctx.rebuild();

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MEEET State</title>
    <link rel="stylesheet" href="/main.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>`;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const sendFile = async (filePath, res) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";
  const content = await fs.readFile(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/" || (!pathname.includes(".") && !pathname.startsWith("/assets/"))) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    const devAssetPath = path.join(outDir, pathname.replace(/^\//, ""));
    if (existsSync(devAssetPath)) {
      await sendFile(devAssetPath, res);
      return;
    }

    const publicAssetPath = path.join(rootDir, "public", pathname.replace(/^\//, ""));
    if (existsSync(publicAssetPath)) {
      await sendFile(publicAssetPath, res);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error instanceof Error ? error.message : "Internal server error");
  }
});

server.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
});

const shutdown = async () => {
  await ctx.dispose();
  server.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
