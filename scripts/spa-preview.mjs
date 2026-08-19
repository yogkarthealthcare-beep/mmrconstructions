import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("dist/mmr-constructions/browser");
const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".xml": "application/xml",
};

http.createServer((request, response) => {
  const requestedPath = decodeURIComponent((request.url || "/").split("?")[0]);
  let filePath = path.join(root, requestedPath);
  if (!path.extname(filePath)) filePath = path.join(root, "index.html");
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.setHeader("Content-Type", contentTypes[path.extname(filePath)] || "application/octet-stream");
    response.end(data);
  });
}).listen(4200, "127.0.0.1", () => {
  console.log("SPA preview available at http://127.0.0.1:4200");
});
