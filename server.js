const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const API_KEY = process.env.OPENWEATHER_API_KEY;

// ===== CURRENT WEATHER =====
app.get("/api/weather/:city", async (req, res) => {
  try {
    const city = req.params.city;

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;
    const response = await axios.get(url);

    res.json(response.data);
  } catch (error) {
    res.status(404).json({ message: "City not found" });
  }
});

// ===== FORECAST =====
app.get("/api/forecast/:city", async (req, res) => {
  try {
    const city = req.params.city;

    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}`;
    const response = await axios.get(url);

    res.json(response.data);
  } catch (error) {
    res.status(404).json({ message: "Forecast not found" });
  }
});

// ===== LOCAL + VERCEL SUPPORT =====
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// IMPORTANT for Vercel
module.exports = app;
