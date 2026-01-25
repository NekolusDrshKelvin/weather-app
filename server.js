const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();   // 👈 ADD THIS

const app = express();
app.use(cors());
app.use(express.static("public"));

const API_KEY = process.env.OPENWEATHER_API_KEY; // 👈 USE ENV

app.get("/weather/:city", async (req, res) => {
    try {
        const city = req.params.city;
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;

        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.status(404).json({ message: "City not found" });
    }
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
