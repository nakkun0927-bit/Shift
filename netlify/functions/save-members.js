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

  if (!Array.isArray(body.members)) {
    return new Response("members must be an array", { status: 400 });
  }

  const cleaned = body.members
    .map((m) => String(m).trim())
    .filter((m) => m.length > 0);

  const store = getStore("shift-schedule");
  await store.setJSON("members", cleaned);

  return new Response(JSON.stringify({ ok: true, members: cleaned }), {
    headers: { "Content-Type": "application/json" },
  });
};
