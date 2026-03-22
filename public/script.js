// ====== CONFIG ======
const DEFAULT_CITY = "Karachi";
let unit = "metric"; // "metric" => °C, "imperial" => °F

// ====== ELEMENTS ======
const el = (id) => document.getElementById(id);

const cityInput = el("city");
const searchBtn = el("searchBtn");
const unitToggle = el("unitToggle");

const tempNow = el("tempNow");
const condNow = el("condNow");
const place = el("place");
const when = el("when");
const icon = el("icon");
const humNow = el("humNow");
const windNow = el("windNow");
const precNow = el("precNow");
const result = el("result");

const linePath = el("linePath");
const areaPath = el("areaPath");
const chartPoints = el("chartPoints");
const chartTimes = el("chartTimes");
const weekRow = el("weekRow");

const windyFrame = el("windyFrame");

// ====== HELPERS ======
function formatLocalTime(unixSeconds, timezoneOffsetSeconds) {
  const ms = (unixSeconds + timezoneOffsetSeconds) * 1000;
  const d = new Date(ms);
  return d.toLocaleString();
}

function timeFromUnix(unixSeconds, tzOffset) {
  const ms = (unixSeconds + tzOffset) * 1000;
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toWindString(speed) {
  return unit === "metric" ? `${Math.round(speed)} m/s` : `${Math.round(speed)} mph`;
}

function emojiForWeather(main) {
  const m = (main || "").toLowerCase();
  if (m.includes("rain")) return "🌧️";
  if (m.includes("cloud")) return "☁️";
  if (m.includes("clear")) return "☀️";
  return "🌡️";
}

function setWindyMap(lat, lon) {
  windyFrame.src = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&zoom=5`;
}

function showError(msg) {
  result.textContent = msg;
}

// ====== API ======
async function fetchCurrent(city) {
  const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}&unit=${unit}`);
  if (!res.ok) throw new Error("City not found");
  return res.json();
}

async function fetchForecast(city) {
  const res = await fetch(`/api/forecast?city=${encodeURIComponent(city)}&unit=${unit}`);
  if (!res.ok) throw new Error("Forecast error");
  return res.json();
}

// ====== MAIN ======
async function loadCity(city) {
  try {
    result.textContent = "Loading...";

    const current = await fetchCurrent(city);
    const forecast = await fetchForecast(city);

    const tz = current.timezone || 0;

    place.textContent = `${current.name}, ${current.sys.country}`;
    when.textContent = formatLocalTime(current.dt, tz);

    tempNow.textContent = Math.round(current.main.temp);
    condNow.textContent = current.weather[0].description;

    humNow.textContent = `${current.main.humidity}%`;
    windNow.textContent = toWindString(current.wind.speed);

    icon.textContent = emojiForWeather(current.weather[0].main);

    setWindyMap(current.coord.lat, current.coord.lon);

    // ====== SIMPLE HOURLY ======
    const hourly = forecast.list.slice(0, 6);

    chartPoints.innerHTML = hourly.map(x => `<span>${Math.round(x.main.temp)}°</span>`).join("");
    chartTimes.innerHTML = hourly.map(x => `<span>${timeFromUnix(x.dt, tz)}</span>`).join("");

    // ====== SIMPLE WEEK ======
    weekRow.innerHTML = forecast.list.slice(0, 7).map(x => `
      <div class="day">
        <div>${timeFromUnix(x.dt, tz)}</div>
        <div>${emojiForWeather(x.weather[0].main)}</div>
        <div>${Math.round(x.main.temp)}°</div>
      </div>
    `).join("");

    result.textContent = "";
  } catch (e) {
    showError(e.message);
  }
}

// ====== EVENTS ======
searchBtn.onclick = () => {
  const city = cityInput.value.trim();
  if (!city) return showError("Enter city");
  loadCity(city);
};

cityInput.addEventListener("keydown", e => {
  if (e.key === "Enter") searchBtn.click();
});

unitToggle.onclick = () => {
  unit = unit === "metric" ? "imperial" : "metric";
  unitToggle.textContent = unit === "metric" ? "°C" : "°F";

  const city = place.textContent.split(",")[0] || DEFAULT_CITY;
  loadCity(city);
};

// ====== INIT ======
loadCity(DEFAULT_CITY);
