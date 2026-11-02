/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const https = require("https");
const path = require("path");
const { getHttpsServerOptions } = require("office-addin-dev-certs");

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, "web");
const LOOPBACK_HOSTS = ["127.0.0.1", "::1"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function getLocalPath(urlPath) {
  let relative = urlPath.split("?")[0];
  if (!relative || relative === "/") {
    relative = "/taskpane.html";
  }

  const target = path.normalize(path.join(ROOT, relative));
  if (!target.startsWith(ROOT)) {
    return null;
  }
  return target;
}

function sendFile(res, absolutePath) {
  fs.readFile(absolutePath, (err, buffer) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache"
    });
    res.end(buffer);
  });
}

function createRequestHandler() {
  return (req, res) => {
    const target = getLocalPath(req.url || "/");
    if (!target) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bad request");
      return;
    }
    sendFile(res, target);
  };
}

function listenOnHost(httpsOptions, host, handler) {
  return new Promise((resolve, reject) => {
    const server = https.createServer(httpsOptions, handler);
    let settled = false;

    server.once("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject({ error, host });
    });

    server.listen(PORT, host, () => {
      settled = true;
      resolve({ server, host });
    });
  });
}

async function start() {
  const httpsOptions = await getHttpsServerOptions();
  const handler = createRequestHandler();
  const listeners = [];
  const failures = [];

  for (const host of LOOPBACK_HOSTS) {
    try {
      listeners.push(await listenOnHost(httpsOptions, host, handler));
    } catch (entry) {
      failures.push(entry);
    }
  }

  if (!listeners.length) {
    const summary = failures
      .map((entry) => `${entry.host}: ${entry.error && entry.error.message ? entry.error.message : String(entry.error)}`)
      .join("; ");
    throw new Error(`Unable to bind add-in server on any loopback interface. ${summary}`);
  }

  console.log(`ETDP Word add-in server running at https://localhost:${PORT}`);
  console.log(`Loopback listeners: ${listeners.map((entry) => entry.host).join(", ")}`);
  if (failures.length) {
    console.warn(
      `Loopback listener warnings: ${failures
        .map((entry) => `${entry.host}: ${entry.error && entry.error.message ? entry.error.message : String(entry.error)}`)
        .join("; ")}`
    );
  }
  console.log("Manifest: " + path.join(__dirname, "manifest.xml"));
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
