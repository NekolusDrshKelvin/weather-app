// ====== CONFIG ======
// NOTE: In plain HTML (no Vite), you cannot read .env in the browser.
// Using the key you provided in .env: OPENWEATHER_API_KEY=...  (but pasted here for browser use)
const API_KEY = "293ae7e9b87c4a377a192b789351006c";
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

// quick check
console.log("API_KEY:", API_KEY);
if (!API_KEY) {
  result.textContent = "Missing API key.";
}

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
  // OpenWeather: m/s in metric, mph in imperial
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
    `&width=650&height=450&zoom=${zoom}&level=surface&overlay=wind&product=ecmwf` +
    `&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=true` +
    `&metricWind=${windyUnitsWind}&metricTemp=${windyUnitsTemp}`;
}

function showError(msg) {
  result.textContent = msg;
}

// ====== CHART ======
function buildChart(temps, labelsTimes) {
  const W = 900;
  const H = 240;
  const topPad = 30;
  const bottomY = 200;

  if (!temps.length) return;

  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const range = Math.max(1, maxT - minT);

  const n = temps.length;
  const xs = temps.map((_, i) => (i * (W / (n - 1))));
  const ys = temps.map(t => {
    const norm = (t - minT) / range;
    return bottomY - norm * (bottomY - topPad);
  });

  const d = [];
  d.push(`M${xs[0].toFixed(2)},${ys[0].toFixed(2)}`);
  for (let i = 1; i < n; i++) {
    const x0 = xs[i - 1], y0 = ys[i - 1];
    const x1 = xs[i], y1 = ys[i];
    const cx = (x0 + x1) / 2;
    d.push(`C${cx.toFixed(2)},${y0.toFixed(2)} ${cx.toFixed(2)},${y1.toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}`);
  }

  const lineD = d.join(" ");
  const areaD = `${lineD} L${W},${H} L0,${H} Z`;

  linePath.setAttribute("d", lineD);
  areaPath.setAttribute("d", areaD);

  chartPoints.innerHTML = "";
  temps.forEach((t, i) => {
    const span = document.createElement("span");
    span.style.left = `${(xs[i] / W) * 100}%`;
    span.textContent = `${Math.round(t)}°`;
    chartPoints.appendChild(span);
  });

  chartTimes.innerHTML = "";
  labelsTimes.forEach((txt) => {
    const span = document.createElement("span");
    span.textContent = txt;
    chartTimes.appendChild(span);
  });
}

// ====== DAILY CARDS ======
function buildDailyCards(list, tzOffset) {
  const byDate = new Map();

  list.forEach(item => {
    const ms = (item.dt + tzOffset) * 1000;
    const d = new Date(ms);
    const key = d.toISOString().slice(0,10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(item);
  });

  const days = Array.from(byDate.entries())
    .slice(0, 7)
    .map(([_, items]) => {
      let best = items[0];
      let bestDiff = Infinity;

      items.forEach(it => {
        const ms = (it.dt + tzOffset) * 1000;
        const h = new Date(ms).getHours();
        const diff = Math.abs(12 - h);
        if (diff < bestDiff) { bestDiff = diff; best = it; }
      });

      const temps = items.map(x => x.main.temp);
      const hi = Math.max(...temps);
      const lo = Math.min(...temps);

      return {
        dow: dayShortFromUnix(best.dt, tzOffset),
        main: best.weather?.[0]?.main || "",
        hi,
        lo
      };
    });

  weekRow.innerHTML = "";
  days.forEach(d => {
    const card = document.createElement("div");
    card.className = "day";
    const em = emojiForWeather(d.main, false);

    card.innerHTML = `
      <div class="dow">${d.dow}</div>
      <div class="mini">${em}</div>
      <div class="hiLo">
        <span>${Math.round(d.hi)}°</span>
        <span>${Math.round(d.lo)}°</span>
      </div>
    `;
    weekRow.appendChild(card);
  });
}

// ====== API ======
async function fetchCurrent(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${unit}`;
  const res = await fetch(url);
  if (!res.ok) {
    // show status to help debugging
    throw new Error(`API error (${res.status}). Check city name or API key.`);
  }
  return res.json();
}

async function fetchForecast(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${unit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast error (${res.status}).`);
  return res.json();
}

// ====== MAIN ======
async function loadCity(city) {
  try {
    result.textContent = "Loading...";
    const current = await fetchCurrent(city);

    const lat = current.coord.lat;
    const lon = current.coord.lon;

    const tzOffset = current.timezone || 0;
    place.textContent = `${current.name}${current.sys?.country ? ", " + current.sys.country : ""}`;
    when.textContent = formatLocalTime(current.dt, tzOffset);

    const main = current.weather?.[0]?.main || "";
    const desc = current.weather?.[0]?.description || main;
    const isNight = current.weather?.[0]?.icon?.includes("n");

    icon.textContent = emojiForWeather(main, isNight);
    tempNow.textContent = Math.round(current.main.temp);
    condNow.textContent = desc ? (desc[0].toUpperCase() + desc.slice(1)) : "--";

    humNow.textContent = `${current.main.humidity}%`;
    windNow.textContent = toWindString(current.wind?.speed ?? 0);

    precNow.textContent = `--%`;

    setWindyMap(lat, lon);

    const forecast = await fetchForecast(lat, lon);
    const list = forecast.list || [];
    const tzOffsetF = forecast.city?.timezone ?? tzOffset;

    const hourly = list.slice(0, 8);
    const temps = hourly.map(x => x.main.temp);
    const times = hourly.map(x => timeFromUnix(x.dt, tzOffsetF));
    buildChart(temps, times);

    buildDailyCards(list, tzOffsetF);

    const pops = hourly.map(x => typeof x.pop === "number" ? x.pop : null).filter(v => v !== null);
    if (pops.length) {
      const avg = pops.reduce((a,b)=>a+b,0) / pops.length;
      precNow.textContent = `${Math.round(avg * 100)}%`;
    } else {
      precNow.textContent = `0%`;
    }

    result.textContent = "";
  } catch (e) {
    showError(e.message || "Something went wrong.");
  }
}

// ====== EVENTS ======
searchBtn.addEventListener("click", () => {
  const val = cityInput.value.trim();
  if (!val) return showError("Type a city name.");
  loadCity(val);
});

cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

unitToggle.addEventListener("click", () => {
  unit = (unit === "metric") ? "imperial" : "metric";
  unitToggle.textContent = (unit === "metric") ? "°C" : "°F";

  // Use current displayed city name when toggling
  const currentCity = (place.textContent.split(",")[0] || "").trim() || cityInput.value.trim() || DEFAULT_CITY;
  loadCity(currentCity);
});

// ====== INIT ======
loadCity(DEFAULT_CITY);
