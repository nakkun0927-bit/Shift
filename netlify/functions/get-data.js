import { getStore } from "@netlify/blobs";

// ---- initial sample data (only used the very first time, before anyone
//      has saved anything through the admin page) ----------------------
const SEED_MEMBERS = ["田中 太郎", "佐藤 花子", "鈴木 一郎", "高橋 美咲", "伊藤 健太"];
const SEED_PATTERNS = [
  ["9:00-18:00", "9:00-18:00", "7:00-16:00", "7:00-16:00", "13:00-22:00", "休", "休"],
  ["7:00-16:00", "7:00-16:00", "9:00-18:00", "9:00-18:00", "休", "休", "13:00-22:00"],
  ["13:00-22:00", "13:00-22:00", "休", "休", "9:00-18:00", "9:00-18:00", "7:00-16:00"],
  ["休", "9:00-18:00", "9:00-18:00", "7:00-16:00", "7:00-16:00", "13:00-22:00", "休"],
  ["9:00-18:00", "休", "休", "13:00-22:00", "13:00-22:00", "9:00-18:00", "9:00-18:00"],
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

function buildSeedMonth(y, m) {
  const dim = daysInMonth(y, m);
  const shifts = {};
  for (let d = 1; d <= dim; d++) {
    const dateStr = `${y}-${pad2(m)}-${pad2(d)}`;
    shifts[dateStr] = SEED_MEMBERS.map((name, idx) => ({
      name,
      time: SEED_PATTERNS[idx][(d - 1) % 7],
    }));
  }
  return {
    label: `${y}年${m}月`,
    note: "サンプルデータです。管理ページ（/admin）から編集できます。",
    shifts,
  };
}

export default async (req, context) => {
  const store = getStore("shift-schedule");

  let members = await store.get("members", { type: "json" });
  if (!members) {
    members = SEED_MEMBERS;
    await store.setJSON("members", members);
  }

  const { blobs } = await store.list({ prefix: "month:" });
  const months = {};

  if (blobs.length === 0) {
    // seed "this month" and "last month" so the site is usable immediately
    const now = new Date();
    for (let offset = -1; offset <= 0; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${pad2(m)}`;
      const monthData = buildSeedMonth(y, m);
      await store.setJSON(`month:${key}`, monthData);
      months[key] = monthData;
    }
  } else {
    for (const b of blobs) {
      const key = b.key.replace("month:", "");
      months[key] = await store.get(b.key, { type: "json" });
    }
  }

  return new Response(JSON.stringify({ members, months }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
