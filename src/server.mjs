import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createService, Problem } from "./domain.mjs";
import { sampleExtract, claudeExtractor } from "./extract.mjs";

export function createServer({
  service = createService(sampleExtract),
  publicDir = new URL("../docs/", import.meta.url),
} = {}) {
  return http.createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, {
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      res.end(JSON.stringify(data));
    };
    try {
      // Loopback binding plus Host/Origin checks prevent a web page using this as an AI proxy.
      const authority = `127.0.0.1:${req.socket.localPort}`;
      if (
        req.headers.host !== authority &&
        req.headers.host !== `localhost:${req.socket.localPort}`
      )
        return send(403, { error: "Local access only." });
      if (
        req.headers.origin &&
        req.headers.origin !== `http://${req.headers.host}`
      )
        return send(403, { error: "Cross-origin requests are not allowed." });
      const path = new URL(req.url, "http://localhost").pathname;
      if (req.method === "GET" && path === "/api/state")
        return send(200, service.snapshot());
      if (
        req.method === "POST" &&
        ["/api/analyse", "/api/approve"].includes(path)
      ) {
        if (!(req.headers["content-type"] || "").startsWith("application/json"))
          throw new Problem("Use application/json.", 415);
        let raw = "";
        for await (const chunk of req) {
          raw += chunk;
          if (Buffer.byteLength(raw) > 24000)
            throw new Problem("Request too large.", 413);
        }
        let body;
        try {
          body = JSON.parse(raw);
        } catch {
          throw new Problem("Invalid JSON.");
        }
        if (!body || typeof body !== "object")
          throw new Problem("Invalid request.");
        if (path === "/api/analyse")
          return send(200, await service.analyse(body.text));
        return send(
          200,
          service.approve(
            body.id,
            body.fields,
            body.simulateLostResponse === true,
          ),
        );
      }
      const staticFiles = {
        "/": ["index.html", "text/html"],
        "/index.html": ["index.html", "text/html"],
        "/app.js": ["app.js", "text/javascript"],
        "/app.css": ["app.css", "text/css"],
        "/app.js.LEGAL.txt": ["app.js.LEGAL.txt", "text/plain"],
      };
      if (req.method !== "GET" || !staticFiles[path])
        return send(404, { error: "Not found." });
      const [name, type] = staticFiles[path];
      let data = await readFile(new URL(name, publicDir));
      if (name === "index.html")
        data = Buffer.from(
          data
            .toString()
            .replace('data-runtime="browser"', 'data-runtime="server"'),
        );
      res.writeHead(200, {
        "content-type": type,
        "x-content-type-options": "nosniff",
        "content-security-policy":
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
        "cache-control": "no-cache",
      });
      res.end(data);
    } catch (error) {
      send(error instanceof Problem ? error.status : 500, {
        error:
          error instanceof Problem
            ? error.message
            : "Unexpected server error. No details are exposed.",
      });
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const live = Boolean(
    process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_MODEL,
  );
  const extract = live
    ? claudeExtractor({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL,
        workspaceId: process.env.ANTHROPIC_WORKSPACE_ID,
      })
    : sampleExtract;
  const server = createServer({
    service: createService(extract, live ? "live" : "sample"),
  });
  server.listen(Number(process.env.PORT || 4317), "127.0.0.1", () =>
    console.log(
      `Enquiry Desk: http://127.0.0.1:${server.address().port} (${live ? "live AI" : "sample"} mode)`,
    ),
  );
}
