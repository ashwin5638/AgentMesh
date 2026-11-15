// Local workspace store. The API exposes writes (register, publish, delete) but
// no read endpoints yet, so this browser keeps its own copy of the rows it has
// created and shows one example agent to demonstrate the table layout.

const storageKey = "agentmesh-workspace-v1";

function daysAgo(days, hours = 10, minutes = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function clockOf(value) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dayOf(value) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function createSeed() {
  const agentCreatedAt = daysAgo(6, 9, 12);
  const signalCreatedAt = daysAgo(2, 10, 42);
  const signalId = "c2f9a1b4-7d3e-4f8a-9c21-5b6d0e4a3f12";

  return {
    agents: [
      {
        id: "7f1c2e5a-4b1d-4c2e-9a7f-3d1e8b6c0a21",
        company: "PhonePe",
        host: "hooks.phonepe.example",
        status: "Active",
        createdAt: agentCreatedAt,
        created: dayOf(agentCreatedAt),
        example: true,
      },
    ],
    signals: [
      {
        id: signalId,
        publisher: "PhonePe",
        content: "Launching a merchant lending product for small businesses in India.",
        matched: 1,
        delivery: "Delivered",
        createdAt: signalCreatedAt,
        time: clockOf(signalCreatedAt),
        example: true,
      },
    ],
    routing: [
      {
        id: "seed-routing-1",
        post: signalId.slice(0, 8),
        target: "Northstar Capital",
        distance: 0.12,
        score: 0.91,
        delivered: true,
        createdAt: signalCreatedAt,
        example: true,
      },
    ],
  };
}

function cleanList(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object" && item.id) : [];
}

export function loadWorkspace() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return createSeed();
    const parsed = JSON.parse(raw);
    return {
      agents: cleanList(parsed.agents),
      signals: cleanList(parsed.signals),
      routing: cleanList(parsed.routing),
    };
  } catch {
    return createSeed();
  }
}

export function saveWorkspace({ agents, signals, routing }) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ agents, signals, routing }));
  } catch {
    // Storage can be full or blocked; the in-memory workspace still works.
  }
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function buildThroughput(signals, routing) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    days.push({
      key: date.toDateString(),
      label: weekdayLabels[date.getDay()],
      date: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      signals: 0,
      matches: 0,
    });
  }

  const byDay = new Map(days.map((day) => [day.key, day]));
  const bucket = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return byDay.get(parsed.toDateString()) || null;
  };

  signals.forEach((signal) => {
    const day = bucket(signal.createdAt);
    if (day) day.signals += 1;
  });

  routing.forEach((item) => {
    if (!item.delivered) return;
    const day = bucket(item.createdAt);
    if (day) day.matches += 1;
  });

  return days;
}

export function buildPipeline({ signals, routing }) {
  const signalCount = signals.length;
  const candidateCount = routing.length;
  const deliveredCount = routing.filter((item) => item.delivered).length;
  const passRate = candidateCount ? Math.round((deliveredCount / candidateCount) * 100) : 0;

  return [
    {
      label: "Embedding",
      detail: "Text into a 1536-dim vector",
      count: signalCount,
      meta: signalCount === 1 ? "signal" : "signals",
    },
    {
      label: "Vector recall",
      detail: "pgvector, top 50 per signal",
      count: candidateCount,
      meta: candidateCount === 1 ? "candidate" : "candidates",
    },
    {
      label: "LLM rerank",
      detail: "Batched 0–1 relevance score",
      count: candidateCount,
      meta: "scored",
    },
    {
      label: "Threshold",
      detail: "Score 0.75 and above",
      count: deliveredCount,
      meta: candidateCount ? `${passRate}% pass` : "no data",
    },
    {
      label: "Webhook delivery",
      detail: "HMAC signed with retries",
      count: deliveredCount,
      meta: "sent",
    },
  ];
}
