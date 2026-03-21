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
  const day = d.toLocaleDateString(undefined, { weekday: "long" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${day} ${time}`;
}

function dayShortFromUnix(unixSeconds, tzOffset) {
  const ms = (unixSeconds + tzOffset) * 1000;
  return new Date(ms).toLocaleDateString(undefined, { weekday: "short" });
}

function timeFromUnix(unixSeconds, tzOffset) {
  const ms = (unixSeconds + tzOffset) * 1000;
  return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function toWindString(speed) {
  return unit === "metric" ? `${Math.round(speed)} m/s` : `${Math.round(speed)} mph`;
}

function emojiForWeather(main, isNight) {
  const m = (main || "").toLowerCase();
  if (m.includes("thunder")) return "⛈️";
  if (m.includes("drizzle")) return "🌦️";
  if (m.includes("rain")) return "🌧️";
  if (m.includes("snow")) return "❄️";
  if (m.includes("cloud")) return isNight ? "☁️" : "⛅";
  if (m.includes("mist") || m.includes("fog") || m.includes("haze")) return "🌫️";
  return isNight ? "🌙" : "☀️";
}

function setWindyMap(lat, lon) {
  const zoom = 6;
  const windyUnitsWind = unit === "metric" ? "km%2Fh" : "mph";
  const windyUnitsTemp = unit === "metric" ? "%C2%B0C" : "%C2%B0F";

  windyFrame.src =
    `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}` +
    `&detailLat=${lat}&detailLon=${lon}` +
    `&zoom=${zoom}&level=surface&overlay=wind` +
    `&metricWind=${windyUnitsWind}&metricTemp=${windyUnitsTemp}`;
}

function showError(msg) {
  result.textContent = msg;
}

// ====== CHART ======
function buildChart(temps, labelsTimes) {
  if (!temps.length) return;

  const W = 900, H = 240, topPad = 30, bottomY = 200;
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const range = Math.max(1, maxT - minT);

  const xs = temps.map((_, i) => i * (W / (temps.length - 1)));
  const ys = temps.map(t => bottomY - ((t - minT) / range) * (bottomY - topPad));

  let d = `M${xs[0]},${ys[0]}`;
  for (let i = 1; i < xs.length; i++) {
    const cx = (xs[i - 1] + xs[i]) / 2;
    d += ` C${cx},${ys[i - 1]} ${cx},${ys[i]} ${xs[i]},${ys[i]}`;
  }

  linePath.setAttribute("d", d);
  areaPath.setAttribute("d", `${d} L${W},${H} L0,${H} Z`);

  chartPoints.innerHTML = "";
  temps.forEach((t, i) => {
    const span = document.createElement("span");
    span.style.left = `${(xs[i] / W) * 100}%`;
    span.textContent = `${Math.round(t)}°`;
    chartPoints.appendChild(span);
  });

  chartTimes.innerHTML = "";
  labelsTimes.forEach(txt => {
    const span = document.createElement("span");
    span.textContent = txt;
    chartTimes.appendChild(span);
  });
}

// ====== DAILY ======
function buildDailyCards(list, tzOffset) {
  const byDate = new Map();

  list.forEach(item => {
    const key = new Date((item.dt + tzOffset) * 1000).toISOString().slice(0,10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(item);
  });

  weekRow.innerHTML = "";

  Array.from(byDate.values()).slice(0, 7).forEach(items => {
    const temps = items.map(x => x.main.temp);
    const hi = Math.max(...temps);
    const lo = Math.min(...temps);

    const best = items[Math.floor(items.length / 2)];

    const card = document.createElement("div");
    card.className = "day";

    card.innerHTML = `
      <div>${dayShortFromUnix(best.dt, tzOffset)}</div>
      <div>${emojiForWeather(best.weather[0].main)}</div>
      <div>${Math.round(hi)}° / ${Math.round(lo)}°</div>
    `;

    weekRow.appendChild(card);
  });
}

// ====== API ======
async function fetchCurrent(city) {
  const res = await fetch(`/api/weather/${encodeURIComponent(city)}`);
  if (!res.ok) throw new Error("City not found");
  return res.json();
}

async function fetchForecast(city) {
  const res = await fetch(`/api/forecast/${encodeURIComponent(city)}`);
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

    const list = forecast.list;
    const hourly = list.slice(0, 8);

    buildChart(
      hourly.map(x => x.main.temp),
      hourly.map(x => timeFromUnix(x.dt, forecast.city.timezone))
    );

    buildDailyCards(list, forecast.city.timezone);

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
