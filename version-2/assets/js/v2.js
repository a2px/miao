/* Miao, version 2: header, hours status, distance, and the looping flavor card fan. */
(() => {
  const cafe = window.MIAO;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const a = cafe.address;
  $$("[data-address-short]").forEach((el) => (el.textContent = a.short));
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---- mobile menu ---- */
  const navToggle = $("[data-nav-toggle]");
  const navLinks = $("#nav-links");
  const setNav = (open) => {
    navToggle.setAttribute("aria-expanded", String(open));
    navLinks.classList.toggle("is-open", open);
  };
  navToggle.addEventListener("click", () => setNav(navToggle.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") { setNav(false); navToggle.focus(); }
  });

  /* ---- pause control for the floating notebook and pen (WCAG 2.2.2) ---- */
  const root = document.documentElement;
  const motionBtn = $("[data-motion-toggle]");
  let motionOff = localStorage.getItem("miao-motion") === "off";
  const applyMotion = () => {
    root.classList.toggle("motion-off", motionOff);
    motionBtn.textContent = motionOff ? "Play animations" : "Pause animations";
  };
  motionBtn.addEventListener("click", () => {
    motionOff = !motionOff;
    localStorage.setItem("miao-motion", motionOff ? "off" : "on");
    applyMotion();
  });
  applyMotion();

  /* ---- open / closed, in the cafe's time zone ---- */
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fmt = (t) => {
    let [h, m] = t.split(":").map(Number);
    h %= 24;
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  };
  const windowFor = (day) => {
    const o = toMin(cafe.hours[day].open);
    let c = toMin(cafe.hours[day].close);
    if (c <= o) c += 1440;
    return [o, c];
  };
  const hoursStatus = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: cafe.timeZone, weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    const day = DAYS.indexOf(get("weekday"));
    const minutes = Number(get("hour")) * 60 + Number(get("minute"));
    const yesterday = (day + 6) % 7;
    const yc = windowFor(yesterday)[1];
    if (yc > 1440 && minutes + 1440 < yc) return { open: true, closes: cafe.hours[yesterday].close };
    const [o, c] = windowFor(day);
    if (minutes >= o && minutes < c) return { open: true, closes: cafe.hours[day].close };
    return { open: false, opens: minutes < o ? cafe.hours[day].open : cafe.hours[(day + 1) % 7].open };
  };
  const renderStatus = () => {
    const s = hoursStatus();
    $("[data-status-text]").textContent = s.open ? `Open now · until ${fmt(s.closes)}` : `Closed · opens ${fmt(s.opens)}`;
    $("[data-status-hud]").dataset.open = String(s.open);
  };
  renderStatus();
  setInterval(renderStatus, 60 * 1000);

  /* ---- how far away (worked out on the visitor's device; nothing is sent anywhere) ---- */
  const hudDistance = $("[data-distance-hud]");
  const miles = (lat1, lng1, lat2, lng2) => {
    const rad = (d) => (d * Math.PI) / 180;
    const h = Math.sin(rad(lat2 - lat1) / 2) ** 2
      + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
    return 2 * 3958.8 * Math.asin(Math.sqrt(h));
  };
  const showDistance = (pos) => {
    const mi = miles(pos.coords.latitude, pos.coords.longitude, cafe.coords.lat, cafe.coords.lng);
    if (mi < 0.05) { hudDistance.textContent = "You're here. Come on in!"; return; }
    const road = mi * 1.3;
    const drive = Math.max(1, Math.round((Math.min(road, 3) / 25) * 60 + (Math.max(0, road - 3) / 45) * 60 + 3));
    const t = drive < 60 ? `${drive} min` : `${Math.floor(drive / 60)} hr${drive % 60 ? ` ${drive % 60} min` : ""}`;
    hudDistance.textContent = `${mi < 10 ? mi.toFixed(1) : Math.round(mi).toLocaleString()} mi away · ~${t} drive`;
  };
  const locate = () => {
    if (!("geolocation" in navigator)) { hudDistance.textContent = "Location is off"; return; }
    hudDistance.textContent = "Finding you…";
    navigator.geolocation.getCurrentPosition(showDistance, () => { hudDistance.textContent = "Location is off"; },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 });
  };
  $$("[data-locate]").forEach((b) => b.addEventListener("click", locate));
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: "geolocation" }).then((st) => { if (st.state === "granted") locate(); }).catch(() => {});
  }

  /* ---- the flavor fan: the middle card is the pick, and it loops forever ---- */
  const hero = $("[data-hero]");
  const fan = $("[data-fan]");
  const cards = $$("[data-card]");
  const picked = $("[data-picked]");
  const n = cards.length;
  let at = cards.findIndex((c) => c.dataset.card === "assam");

  const render = () => {
    cards.forEach((card, i) => {
      // offset from the middle card, wrapped so it runs -2 .. 2 (with more cards, the rest wait behind the middle)
      let o = (((i - at) % n) + n) % n;
      if (o > n / 2) o -= n;
      const back = Math.abs(o) > 2;
      card.style.setProperty("--o", back ? 0 : o);
      card.style.setProperty("--d", back ? 0 : Math.abs(o));
      card.classList.toggle("is-center", o === 0);
      card.classList.toggle("is-back", back);
      const btn = $(".fan__btn", card);
      btn.tabIndex = back ? -1 : 0;
      btn.setAttribute("aria-pressed", String(o === 0));
    });
    const key = cards[at].dataset.card;
    hero.dataset.flavor = key;
    document.documentElement.dataset.flavor = key; // the menu bar follows the flavor too
    picked.textContent = $(".fan__name", cards[at]).textContent;
  };
  const step = (dir) => { at = (at + dir + n) % n; render(); };

  $$("[data-step]").forEach((b) => b.addEventListener("click", () => step(Number(b.dataset.step))));
  cards.forEach((card, i) => $(".fan__btn", card).addEventListener("click", () => {
    if (i !== at) { at = i; render(); }
  }));
  fan.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  });

  // Swipe on phones.
  let startX = null;
  fan.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") startX = e.clientX; });
  fan.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
  });
  fan.addEventListener("pointercancel", () => { startX = null; });

  render();
})();
