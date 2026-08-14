const express = require("express");
const crypto = require("crypto");
const { createMiddleware } = require("saweria-webhook-express");

const app = express();
app.use(express.json());

const verifySignature = createMiddleware(process.env.SAWERIA_STREAM_KEY, {
  camelCase: true,
});

let queue = [];
const LEASE_DURATION_MS = 60 * 1000;

function generateId() {
  return crypto.randomUUID();
}

app.get("/", (req, res) => {
  res.json({ ok: true, queued: queue.length });
});

// Saweria kirim donasi ke sini
app.post("/webhook/saweria", verifySignature, (req, res) => {
  const body = req.body || {};
  queue.push({
    id: generateId(),
    donator_name: body.donatorName || body.donator_name || "Anonymous",
    amount: Number(body.amountRaw || body.amount_raw || body.amount || 0),
    message: body.message || "",
    createdAt: body.createdAt || new Date().toISOString(),
    leaseToken: null,
    leaseExpiry: 0,
  });
  console.log("Donasi masuk:", body);
  res.sendStatus(200);
});

// Roblox tanya donasi baru ke sini
app.post("/api/pull", (req, res) => {
  const limit = Math.min(Math.max(Number(req.body?.limit) || 10, 1), 25);
  const now = Date.now();
  const available = queue.filter((i) => !i.leaseToken || i.leaseExpiry < now);
  const selected = available.slice(0, limit);

  selected.forEach((item) => {
    item.leaseToken = generateId();
    item.leaseExpiry = now + LEASE_DURATION_MS;
  });

  res.json({
    ok: true,
    items: selected.map((item) => ({
      id: item.id,
      leaseToken: item.leaseToken,
      donator_name: item.donator_name,
      amount: item.amount,
      message: item.message,
      createdAt: item.createdAt,
    })),
  });
});

// Roblox konfirmasi donasi sudah diproses
app.post("/api/ack", (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  items.forEach((ack) => {
    const found = queue.find((i) => i.id === ack.id && i.leaseToken === ack.leaseToken);
    if (!found) return;
    if (ack.status === "done") {
      queue = queue.filter((i) => i.id !== ack.id);
    } else {
      found.leaseToken = null;
      found.leaseExpiry = 0;
    }
  });
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Worker jalan di port " + PORT));
