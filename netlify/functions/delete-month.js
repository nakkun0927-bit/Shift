import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const user = await getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { key } = body || {};
  if (!/^\d{4}-\d{2}$/.test(key || "")) {
    return new Response("invalid month key (expected YYYY-MM)", { status: 400 });
  }

  const store = getStore("shift-schedule");
  await store.delete(`month:${key}`);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
