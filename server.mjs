import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";

const port = Number(process.env.PORT || 4173);
const root = process.cwd();
const publicFiles = new Set([
  "index.html",
  "styles.css",
  "app.js",
  "assets/projects/ggbaaz.png",
  "assets/projects/konkurstudy.png",
  "assets/projects/marketnavigator.png",
]);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const requestedFile = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    if (!publicFiles.has(requestedFile)) throw new Error("File is not public");

    const filePath = join(root, requestedFile);
    await stat(filePath);

    const contents = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(contents);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Portfolio running at http://localhost:${port}`);
});
