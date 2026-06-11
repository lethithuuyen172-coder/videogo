import { spawn } from "node:child_process";

const baseUrl = process.env.FRONTEND_BASE_URL ?? "http://localhost:3000";
const server = spawn(process.execPath, [".next/standalone/server.js"], {
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForReady() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`standalone server exited early:\n${logs.join("")}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error(`standalone server did not become ready:\n${logs.join("")}`);
}

try {
  await waitForReady();
  await import("./check-standalone-routes.mjs");
} finally {
  server.kill();
}
