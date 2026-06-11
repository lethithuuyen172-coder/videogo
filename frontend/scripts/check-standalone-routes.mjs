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

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
