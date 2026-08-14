const { Client } = require("saweria-api");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

let latestDonations = [];

const client = new Client();
client.setStreamKey(process.env.SAWERIA_STREAM_KEY);

client.on("donation", (data) => {
  console.log("Donasi masuk:", data);
  latestDonations.push({
    donator: data.donator,
    amount: data.amount,
    message: data.message,
    timestamp: Date.now(),
  });
  if (latestDonations.length > 50) latestDonations.shift();
});

client.connect();

app.get("/donations", (req, res) => {
  res.json(latestDonations);
});

app.get("/donations/pull", (req, res) => {
  res.json(latestDonations);
  latestDonations = [];
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Worker jalan di port " + PORT));
