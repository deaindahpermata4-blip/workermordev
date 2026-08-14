const express = require("express");
const { createMiddleware } = require("saweria-webhook-express");

const app = express();
app.use(express.json());

const verifySignature = createMiddleware(process.env.SAWERIA_STREAM_KEY, {
  camelCase: true,
});

let latestDonations = [];

app.post("/webhook/saweria", verifySignature, (req, res) => {
  console.log("Donasi masuk:", req.body);
  latestDonations.push({
    donator: req.body.donatorName,
    amount: req.body.amountRaw,
    message: req.body.message,
    timestamp: Date.now(),
  });
  if (latestDonations.length > 50) latestDonations.shift();
  res.sendStatus(200);
});

app.get("/donations/pull", (req, res) => {
  res.json(latestDonations);
  latestDonations = [];
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Worker jalan di port " + PORT));
