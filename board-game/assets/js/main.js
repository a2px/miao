(() => {
  "use strict";

  const cafe = window.MIAO;
  const root = document.documentElement;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let motionOff = reduceMotionQuery.matches || localStorage.getItem("miao-motion") === "off";

  /* ---------------------------------------------------------
     Cafe details from config
     --------------------------------------------------------- */
  const a = cafe.address;
  const fullAddress = `${a.street}, ${a.city}, ${a.region} ${a.postal}`;
  $$("[data-address-short]").forEach((el) => (el.textContent = a.short));
  $$("[data-address-line1]").forEach((el) => (el.textContent = a.street));
  $$("[data-address-line2]").forEach((el) => (el.textContent = `${a.city}, ${a.region} ${a.postal}`));
  $$("[data-address-full]").forEach((el) => (el.textContent = fullAddress));
  $$("[data-email]").forEach((el) => { el.textContent = cafe.email; el.href = `mailto:${cafe.email}`; });
  $$("[data-phone]").forEach((el) => { el.textContent = cafe.phone; el.href = `tel:${cafe.phone.replace(/[^\d+]/g, "")}`; });
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // Directions aim at the business by name and address so maps apps land on the shop itself.
  const dest = encodeURIComponent(`${cafe.name}, ${fullAddress}`);
  const googleLink = $("[data-directions-google]");
  const appleLink = $("[data-directions-apple]");
  googleLink.href = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  appleLink.href = `https://maps.apple.com/?daddr=${encodeURIComponent(fullAddress)}`;
  const map = $("[data-map]");
  if (map) {
    const { lat, lng } = cafe.coords;
    const bbox = [lng - 0.008, lat - 0.004, lng + 0.008, lat + 0.004].map((n) => n.toFixed(4)).join("%2C");
    map.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  }

  /* ---------------------------------------------------------
     Navigation (mobile disclosure)
     --------------------------------------------------------- */
  const navToggle = $("[data-nav-toggle]");
  const navLinks = $("#nav-links");
  const setNav = (open) => {
    navToggle.setAttribute("aria-expanded", String(open));
    navLinks.classList.toggle("is-open", open);
  };
  navToggle.addEventListener("click", () => setNav(navToggle.getAttribute("aria-expanded") !== "true"));
  navLinks.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
      setNav(false);
      navToggle.focus();
    }
  });

  /* ---------------------------------------------------------
     Motion on/off (WCAG 2.2.2 pause control)
     --------------------------------------------------------- */
  const motionBtn = $("[data-motion-toggle]");
  const applyMotion = () => {
    root.classList.toggle("motion-off", motionOff);
    motionBtn.setAttribute("aria-pressed", String(motionOff));
  };
  motionBtn.addEventListener("click", () => {
    motionOff = !motionOff;
    localStorage.setItem("miao-motion", motionOff ? "off" : "on");
    applyMotion();
  });

  const hero = $("[data-hero]");

  /* ---------------------------------------------------------
     Hero: the Miao board game
     On load the board sets itself up (spaces dealt in clockwise from GO),
     then the cat token drops onto GO. Roll the dice or pick a space to move.
     --------------------------------------------------------- */
  const board = $("[data-board]");
  const spaces = $$("[data-space]");
  const token = $("[data-token]");
  const dice = $$("[data-die]");
  const rollBtn = $("[data-roll]");
  const deed = {
    band: $("[data-deed-band]"),
    title: $("[data-deed-title]"),
    text: $("[data-deed-text]"),
    cta: $("[data-deed-cta]"),
  };
  let at = 0;
  let moving = false;
  const wait = (ms) => new Promise((r) => setTimeout(r, motionOff ? 0 : ms));

  const placeToken = (i) => {
    const b = board.getBoundingClientRect();
    const r = spaces[i].getBoundingClientRect();
    // perch in the space's top-right corner so its name stays readable
    const x = r.right - b.left - token.offsetWidth - r.width * 0.04;
    const y = r.top - b.top + r.height * 0.06;
    token.style.transform = `translate(${x}px, ${y}px)`;
  };
  const showDeed = (i) => {
    const s = spaces[i].dataset;
    deed.band.style.background = s.color;
    deed.title.textContent = s.name;
    deed.text.textContent = s.text;
    if (s.link) {
      deed.cta.href = s.link;
      deed.cta.textContent = s.cta;
      deed.cta.hidden = false;
    } else {
      deed.cta.hidden = true;
    }
    spaces.forEach((el, k) => {
      el.parentElement.classList.toggle("is-here", k === i);
      el.setAttribute("aria-pressed", String(k === i));
    });
  };
  const hopTo = async (target, stepsForward) => {
    moving = true;
    for (let n = 0; n < stepsForward; n++) {
      at = (at + 1) % spaces.length;
      placeToken(at);
      token.classList.remove("is-hop");
      void token.offsetWidth; // restart the hop
      token.classList.add("is-hop");
      await wait(230);
    }
    at = target;
    placeToken(at);
    showDeed(at);
    moving = false;
  };
  // pip positions on a 3x3 grid for each face
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const setDie = (el, n) => {
    el.dataset.n = String(n);
    el.innerHTML = Array.from({ length: 9 }, (_, k) => `<i${PIPS[n].includes(k) ? ' class="on"' : ""}></i>`).join("");
  };
  const roll = async () => {
    if (moving) return;
    rollBtn.disabled = true;
    let a = 1;
    let b = 1;
    for (let k = 0; k < (motionOff ? 1 : 8); k++) {
      a = 1 + Math.floor(Math.random() * 6);
      b = 1 + Math.floor(Math.random() * 6);
      setDie(dice[0], a);
      setDie(dice[1], b);
      await wait(70);
    }
    const steps = a + b;
    rollBtn.textContent = `Rolled ${steps}! Roll again`;
    await hopTo((at + steps) % spaces.length, motionOff ? 0 : steps);
    rollBtn.disabled = false;
  };
  rollBtn.addEventListener("click", roll);
  spaces.forEach((el, i) => el.addEventListener("click", () => {
    if (moving) return;
    const steps = (i - at + spaces.length) % spaces.length;
    hopTo(i, motionOff ? 0 : steps);
  }));
  window.addEventListener("resize", () => placeToken(at), { passive: true });
  setDie(dice[0], 5);
  setDie(dice[1], 2);

  // Set up the board: the frame unfolds, spaces are dealt in, then the token drops onto GO.
  const welcome = () => {
    placeToken(0);
    showDeed(0);
    deed.title.textContent = "Welcome to Miao";
    deed.text.textContent = "Doors open at 1 PM every day. Roll the dice, or pick any space, to explore the cafe.";
  };
  if (motionOff) {
    hero.dataset.state = "inside";
    requestAnimationFrame(welcome);
  } else {
    hero.dataset.state = "setup";
    wait(spaces.length * 45 + 1300).then(() => {
      welcome();
      hero.dataset.state = "inside";
    });
  }

  /* ---------------------------------------------------------
     Hours and open/closed status (in the cafe's time zone)
     --------------------------------------------------------- */
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fmt = (t) => {
    let [h, m] = t.split(":").map(Number);
    h %= 24;
    const suffix = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
  };
  // A day's window in minutes from that day's midnight; closes after midnight run past 1440.
  const windowFor = (day) => {
    const { open, close } = cafe.hours[day];
    const o = toMin(open);
    let c = toMin(close);
    if (c <= o) c += 1440;
    return [o, c];
  };

  const cafeNow = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: cafe.timeZone, weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    return { day: DAYS.indexOf(get("weekday")), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
  };

  const hoursStatus = () => {
    const { day, minutes } = cafeNow();
    const yesterday = (day + 6) % 7;
    const [yo, yc] = windowFor(yesterday);
    if (yc > 1440 && minutes + 1440 < yc) {
      return { open: true, businessDay: yesterday, closes: cafe.hours[yesterday].close };
    }
    const [o, c] = windowFor(day);
    if (minutes >= o && minutes < c) return { open: true, businessDay: day, closes: cafe.hours[day].close };
    if (minutes < o) return { open: false, businessDay: day, opens: cafe.hours[day].open, when: "today" };
    const next = (day + 1) % 7;
    return { open: false, businessDay: day, opens: cafe.hours[next].open, when: "tomorrow" };
  };

  const tbody = $("[data-hours-table] tbody");
  const renderHours = () => {
    const s = hoursStatus();
    const order = [1, 2, 3, 4, 5, 6, 0];
    tbody.innerHTML = "";
    order.forEach((d) => {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = DAYS[d];
      const td = document.createElement("td");
      td.textContent = `${fmt(cafe.hours[d].open)} – ${fmt(cafe.hours[d].close)}`;
      if (d === s.businessDay) {
        tr.className = "is-today";
        const tag = document.createElement("span");
        tag.className = "today-tag";
        tag.textContent = "Today";
        th.append(" ", tag);
      }
      tr.append(th, td);
      tbody.append(tr);
    });

    const short = s.open ? `Open now · until ${fmt(s.closes)}` : `Closed · opens ${fmt(s.opens)}`;
    const long = s.open
      ? `Open now until ${fmt(s.closes)}. Grab a seat.`
      : `Closed right now. We open ${s.when} at ${fmt(s.opens)}.`;
    $("[data-status-text]").textContent = short;
    $("[data-status-long]").textContent = long;
    $("[data-status-hud]").dataset.open = String(s.open);
    $("[data-status-banner]").dataset.open = String(s.open);
  };
  renderHours();
  setInterval(renderHours, 60 * 1000);

  /* ---------------------------------------------------------
     Proximity: how far the visitor is, if location is on
     --------------------------------------------------------- */
  const hudDistance = $("[data-distance-hud]");
  const big = $("[data-distance-big]");
  const detail = $("[data-distance-detail]");
  const travel = $("[data-travel]");
  const live = $("[data-distance-live]");
  const proximity = $("[data-proximity]");

  const haversineMiles = (lat1, lng1, lat2, lng2) => {
    const R = 3958.8;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const fmtMiles = (mi) => (mi < 10 ? mi.toFixed(1) : Math.round(mi).toLocaleString());
  const fmtMinutes = (min) => {
    const m = Math.max(1, Math.round(min));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h} hr ${r} min` : `${h} hr`;
  };
  // Rough door-to-door estimates for DFW: streets are ~1.3x the straight line.
  const estimates = (mi) => {
    const road = mi * 1.3;
    const list = [];
    if (road <= 6) list.push(["Walk", (road / 3) * 60]);
    if (road <= 20) list.push(["Bike", (road / 10) * 60]);
    if (road <= 40) list.push(["Transit", (road / 12) * 60 + 8]);
    // Local streets for the first few miles, then highway speeds, plus a few minutes to park.
    list.push(["Drive", (Math.min(road, 3) / 25) * 60 + (Math.max(0, road - 3) / 45) * 60 + 3]);
    return list;
  };

  const showDistance = (pos) => {
    const { latitude, longitude } = pos.coords;
    const mi = haversineMiles(latitude, longitude, cafe.coords.lat, cafe.coords.lng);
    const est = estimates(mi);
    const best = est.find(([mode, t]) => mode === "Walk" && t <= 20) || est.find(([mode]) => mode === "Drive");
    const bestText = `${fmtMinutes(best[1])} ${best[0] === "Walk" ? "walk" : "drive"}`;

    proximity.classList.add("has-distance");
    if (mi < 0.05) {
      big.textContent = "You're here!";
      detail.textContent = "Come on in. The door's the one with the glowing cat.";
      hudDistance.textContent = "You're here. Come on in!";
      live.textContent = "You are at Miao.";
      travel.hidden = true;
    } else {
      const miText = `${fmtMiles(mi)} ${mi < 1.05 && mi >= 0.95 ? "mile" : "miles"} away`;
      big.textContent = miText;
      detail.textContent = mi > 300
        ? "That's a trip. Save us for your next visit to Dallas."
        : `About a ${bestText} from where you are now.`;
      hudDistance.textContent = `${fmtMiles(mi)} mi away · ~${bestText}`;
      live.textContent = `Miao is ${miText}, about a ${bestText}.`;
      travel.innerHTML = "";
      est.forEach(([mode, t]) => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="travel__mode"></span><span class="travel__time"></span>`;
        li.firstChild.textContent = mode;
        li.lastChild.textContent = fmtMinutes(t);
        travel.append(li);
      });
      travel.hidden = false;
    }
    googleLink.href = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${dest}`;
    appleLink.href = `https://maps.apple.com/?saddr=${latitude},${longitude}&daddr=${encodeURIComponent(fullAddress)}`;
  };

  const showLocationOff = (msg) => {
    detail.textContent = msg;
    hudDistance.textContent = "Location is off";
    live.textContent = msg;
  };

  const locate = () => {
    if (!("geolocation" in navigator)) {
      showLocationOff("This browser can't share location, but the directions links below still work.");
      return;
    }
    $$("[data-locate]").forEach((b) => { b.disabled = true; });
    detail.textContent = "Finding you…";
    navigator.geolocation.getCurrentPosition(
      (pos) => { $$("[data-locate]").forEach((b) => { b.disabled = false; }); showDistance(pos); },
      (err) => {
        $$("[data-locate]").forEach((b) => { b.disabled = false; });
        showLocationOff(err.code === err.PERMISSION_DENIED
          ? "Location is turned off, so we can't show the distance. The directions links below still work."
          : "We couldn't get your location just now. Try again, or use the directions links below.");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 },
    );
  };
  $$("[data-locate]").forEach((b) => b.addEventListener("click", locate));

  // Only look up the location by itself when the visitor has already allowed it.
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: "geolocation" }).then((status) => {
      if (status.state === "granted") locate();
      status.onchange = () => { if (status.state === "granted") locate(); };
    }).catch(() => {});
  }

  /* ---------------------------------------------------------
     Social carousel
     --------------------------------------------------------- */
  const drinks = {
    taro:     { bg: ["#2a1d6e", "#b061b8"], tea: ["#c9a6ff", "#8d63d6"], extra: "cloud" },
    lychee:   { bg: ["#2a1240", "#ff4fa8"], tea: ["#ffc2de", "#ff7ac0"], extra: "neon" },
    coldbrew: { bg: ["#160e35", "#3a2a8f"], tea: ["#c69a72", "#5a3523"], extra: "notebook" },
    matcha:   { bg: ["#1f1547", "#2e6f68"], tea: ["#cfeec0", "#6fb37a"], extra: "moon" },
    cat:      { bg: ["#1a1145", "#5b45b8"], tea: ["#f4d9b5", "#b88a5a"], extra: "cat" },
    ube:      { bg: ["#24124a", "#7a3290"], tea: ["#e6d2ff", "#9a6ad6"], extra: "tiger" },
  };
  const drinkSVG = (key, i) => {
    const d = drinks[key];
    const id = `d${i}`;
    const extras = {
      cloud: `<ellipse cx="200" cy="150" rx="70" ry="22" fill="#fff6fb"/><ellipse cx="180" cy="140" rx="34" ry="20" fill="#fff6fb"/><ellipse cx="222" cy="138" rx="30" ry="18" fill="#fff6fb"/>`,
      neon: `<text x="200" y="70" text-anchor="middle" font-family="Pixelify Sans, monospace" font-size="44" fill="none" stroke="#ffe1f1" stroke-width="2">FIZZ</text><g fill="#ff4fa8"><circle cx="186" cy="320" r="9"/><circle cx="214" cy="326" r="9"/><circle cx="200" cy="300" r="8"/></g>`,
      notebook: `<g transform="rotate(-8 90 320)"><rect x="30" y="290" width="130" height="80" rx="4" fill="#f7f0e3"/><path d="M44 310h90M44 326h100M44 342h70" stroke="#6d58c9" stroke-width="3"/></g><path d="M282 300l10-60h70l-10 60z" fill="#b9e9ff"/>`,
      moon: `<circle cx="320" cy="80" r="26" fill="#fff3d1"/><circle cx="96" cy="330" r="34" fill="#2b1c3a"/><circle cx="104" cy="324" r="28" fill="#f3e2c0"/>`,
      cat: `<path d="M50 372c-6-30 0-52 26-60l-4-22 16 14h16l16-14-4 22c26 8 34 30 30 60z" fill="#08051a"/><path d="M78 340q8 6 16 0M104 340q8 6 16 0" stroke="#9ff0c8" stroke-width="3" fill="none"/>`,
      tiger: `<path d="M150 210q20 30 0 60M250 200q-24 40 0 80M170 280q30 10 0 50M232 300q-20 20 0 40" stroke="#5a2a1a" stroke-width="12" fill="none" stroke-linecap="round" opacity=".8"/>`,
    };
    return `<svg viewBox="0 0 400 400" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="${id}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${d.bg[0]}"/><stop offset="1" stop-color="${d.bg[1]}"/></linearGradient>
        <linearGradient id="${id}tea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${d.tea[0]}"/><stop offset="1" stop-color="${d.tea[1]}"/></linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#${id}bg)"/>
      <g fill="#fff" opacity=".7"><circle cx="60" cy="50" r="1.6"/><circle cx="330" cy="40" r="1.4"/><circle cx="280" cy="110" r="1.2"/><circle cx="40" cy="160" r="1.2"/></g>
      <rect y="350" width="400" height="50" fill="#120a2c" opacity=".7"/>
      ${d.extra === "tiger" || d.extra === "cloud" ? "" : extras[d.extra]}
      <path d="M130 130h140l-18 230h-104z" fill="url(#${id}tea)"/>
      ${d.extra === "tiger" ? extras.tiger : ""}
      <g fill="#1d0f22"><circle cx="160" cy="342" r="10"/><circle cx="182" cy="348" r="10"/><circle cx="206" cy="344" r="10"/><circle cx="230" cy="348" r="10"/><circle cx="172" cy="326" r="10"/><circle cx="196" cy="328" r="10"/><circle cx="220" cy="326" r="10"/><circle cx="240" cy="334" r="9"/></g>
      <path d="M130 130h140l-18 230h-104z" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4"/>
      <path d="M124 130q76-60 152 0z" fill="#fff" fill-opacity=".35" stroke="#fff" stroke-opacity=".6" stroke-width="3"/>
      ${d.extra === "cloud" ? extras.cloud : ""}
      <rect x="214" y="40" width="14" height="120" rx="6" fill="#ff7ac0" transform="rotate(12 221 100)"/>
      <path d="M150 170q10 40 0 80" stroke="#fff" stroke-opacity=".35" stroke-width="8" fill="none" stroke-linecap="round"/>
    </svg>`;
  };
  $$("[data-drink]").forEach((el, i) => { el.innerHTML = drinkSVG(el.dataset.drink, i); });

  const track = $("[data-carousel-track]");
  const prev = $("[data-carousel-prev]");
  const next = $("[data-carousel-next]");
  const stepSize = () => {
    const first = track.querySelector(".post");
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return first ? first.getBoundingClientRect().width + gap : track.clientWidth;
  };
  const updateCarousel = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
  };
  prev.addEventListener("click", () => track.scrollBy({ left: -stepSize(), behavior: motionOff ? "auto" : "smooth" }));
  next.addEventListener("click", () => track.scrollBy({ left: stepSize(), behavior: motionOff ? "auto" : "smooth" }));
  track.addEventListener("scroll", () => requestAnimationFrame(updateCarousel), { passive: true });
  window.addEventListener("resize", updateCarousel, { passive: true });
  updateCarousel();

  /* ---------------------------------------------------------
     Rain sounds (generated in the browser, nothing downloaded)
     --------------------------------------------------------- */
  const rainBtn = $("[data-rain]");
  let audio = null;
  const startRain = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const len = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.04 * white) / 1.04; // brown-ish noise: soft and low
        data[i] = last * 3.2 + white * 0.035; // plus a little hiss for droplets
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2400;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.2);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    return { ctx, gain };
  };
  rainBtn.addEventListener("click", () => {
    const on = rainBtn.getAttribute("aria-pressed") !== "true";
    if (on) {
      audio = startRain();
    } else if (audio) {
      const { ctx, gain } = audio;
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      setTimeout(() => ctx.close(), 500);
      audio = null;
    }
    rainBtn.setAttribute("aria-pressed", String(on));
  });

  applyMotion();
})();
