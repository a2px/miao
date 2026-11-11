/* Miao, version 2: header, drive distance, pencil doodles, and the looping flavor card fan. */
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

  /* ---- pencil doodles: measure every line before the drawing animation starts ---- */
  $$(".doodle__line").forEach((path) => {
    path.style.setProperty("--len", String(Math.ceil(path.getTotalLength()) + 2));
  });
  document.documentElement.classList.add("doodles-ready");

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
    if (mi > 300) { hudDistance.textContent = `${Math.round(mi).toLocaleString()} mi away. Save us for your next Dallas trip`; return; }
    const road = mi * 1.3;
    const drive = Math.max(1, Math.round((Math.min(road, 3) / 25) * 60 + (Math.max(0, road - 3) / 45) * 60 + 3));
    const t = drive < 60 ? `${drive} min` : `${Math.floor(drive / 60)} hr${drive % 60 ? ` ${drive % 60} min` : ""}`;
    hudDistance.textContent = `About a ${t} drive · ${mi < 10 ? mi.toFixed(1) : Math.round(mi).toLocaleString()} mi away`;
  };
  const locate = () => {
    if (!("geolocation" in navigator)) { hudDistance.textContent = "Location is off on this browser"; return; }
    hudDistance.textContent = "Finding you…";
    navigator.geolocation.getCurrentPosition(showDistance, () => { hudDistance.textContent = "Location is off. Tap to try again"; },
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

  // Pencil doodles further down the page draw themselves once they scroll into view.
  const lazyDoodles = $$("[data-draw-on-view]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-drawing"); io.unobserve(en.target); }
    }), { threshold: 0.4 });
    lazyDoodles.forEach((el) => io.observe(el));
  } else {
    lazyDoodles.forEach((el) => el.classList.add("is-drawing"));
  }

  render();
})();
