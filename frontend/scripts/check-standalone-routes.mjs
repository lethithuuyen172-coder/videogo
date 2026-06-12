import { spawn } from "node:child_process";

const baseUrl = process.env.FRONTEND_BASE_URL ?? "http://localhost:3000";
const routes = [
  "/",
  "/chat",
  "/image",
  "/video",
  "/assets",
  "/discover",
  "/credits",
  "/credits/recharge",
  "/admin",
  "/auth/login",
  "/auth/register",
  "/canvas",
  "/tools",
];

const failures = [];
let server;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function canReachServer() {
  try {
    const response = await fetch(baseUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await canReachServer()) return;
  server = spawn(process.execPath, [".next/standalone/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: new URL(baseUrl).port || "3000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  server.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  server.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      if (logs.join("").includes("EADDRINUSE")) {
        for (let attempt = 0; attempt < 10; attempt += 1) {
          if (await canReachServer()) return;
          await sleep(500);
        }
      }
      throw new Error(`standalone server exited early:\n${logs.join("")}`);
    }
    if (await canReachServer()) return;
    await sleep(500);
  }
  throw new Error(`standalone server did not become ready:\n${logs.join("")}`);
}

try {
  await ensureServer();

  for (const route of routes) {
    const url = new URL(route, baseUrl);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        failures.push(`${route} -> ${response.status}`);
        continue;
      }
      const body = await response.text();
      if (!body.includes("<html")) {
        failures.push(`${route} -> non-html response`);
      }
      console.log(`${route} ${response.status}`);
    } catch (error) {
      failures.push(`${route} -> ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} finally {
  server?.kill();
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
