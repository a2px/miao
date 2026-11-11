/* Miao, version 2: header, drive distance, pencil doodles, and the looping flavor card fan. */
(() => {
  const cafe = window.MIAO;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const a = cafe.address;
  $$("[data-address-short]").forEach((el) => (el.textContent = a.short));
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  $$("[data-address-line1]").forEach((el) => (el.textContent = a.street));
  $$("[data-address-full]").forEach((el) => (el.textContent = `${a.street}, ${a.city}, ${a.region} ${a.postal}`));
  $$("[data-address-line2]").forEach((el) => (el.textContent = `${a.city}, ${a.region} ${a.postal}`));

  /* ---- copy the address with one tap ---- */
  const copyBtn = $("[data-copy-address]");
  if (copyBtn) {
    const label = $("[data-copy-label]");
    const status = $("[data-copy-status]");
    const icon = $("use", copyBtn);
    const text = `${a.street}, ${a.city}, ${a.region} ${a.postal}`;
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.append(ta); ta.select();
      try { document.execCommand("copy"); } finally { ta.remove(); }
    };
    let resetTimer;
    copyBtn.addEventListener("click", async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text); else fallback();
        label.textContent = "Copied";
        icon.setAttribute("href", "#i-check");
        status.textContent = "Address copied";
      } catch {
        label.textContent = "Couldn't copy";
        status.textContent = "Couldn't copy the address";
      }
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { label.textContent = "Copy"; icon.setAttribute("href", "#i-copy"); status.textContent = ""; }, 2000);
    });
  }

  /* ---- Find us: directions links and the map, centred on the shop ---- */
  const fullAddress = `${a.street}, ${a.city}, ${a.region} ${a.postal}`;
  const dest = encodeURIComponent(`${cafe.name}, ${fullAddress}`);
  $$("[data-directions-google]").forEach((el) => { el.href = `https://www.google.com/maps/dir/?api=1&destination=${dest}`; });
  $$("[data-directions-apple]").forEach((el) => { el.href = `https://maps.apple.com/?daddr=${encodeURIComponent(fullAddress)}`; });
  const map = $("[data-map]");
  if (map) {
    const { lat, lng } = cafe.coords;
    const bbox = [lng - 0.008, lat - 0.004, lng + 0.008, lat + 0.004].map((n) => n.toFixed(4)).join("%2C");
    // no marker from the map itself: our own pin (the Miao icon) sits over the centre
    map.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;
  }

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

  /* ---- hours: today's row and the open/closed line, in the cafe's time zone ---- */
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
    if (windowFor(yesterday)[1] > 1440 && minutes + 1440 < windowFor(yesterday)[1]) {
      return { open: true, businessDay: yesterday, closes: cafe.hours[yesterday].close };
    }
    const [o, c] = windowFor(day);
    if (minutes >= o && minutes < c) return { open: true, businessDay: day, closes: cafe.hours[day].close };
    if (minutes < o) return { open: false, businessDay: day, opens: cafe.hours[day].open, when: "today" };
    return { open: false, businessDay: day, opens: cafe.hours[(day + 1) % 7].open, when: "tomorrow" };
  };
  const hoursBody = $("[data-hours-table] tbody");
  const renderHours = () => {
    if (!hoursBody) return;
    const s = hoursStatus();
    hoursBody.innerHTML = "";
    [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
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
      hoursBody.append(tr);
    });
    $("[data-status-long]").textContent = s.open ? `Open until ${fmt(s.closes)}` : `Closed right now. We open ${s.when} at ${fmt(s.opens)}.`;
    $("[data-status-banner]").dataset.open = String(s.open);
  };
  renderHours();
  setInterval(renderHours, 60 * 1000);

  /* ---- Instagram carousel: arrow buttons scroll one polaroid at a time ---- */
  const track = $("[data-carousel-track]");
  const prevBtn = $("[data-carousel-prev]");
  const nextBtn = $("[data-carousel-next]");
  if (track) {
    const stepSize = () => {
      const first = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first ? first.getBoundingClientRect().width + gap : track.clientWidth;
    };
    const smooth = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
    const updateCarousel = () => {
      prevBtn.disabled = track.scrollLeft <= 2;
      nextBtn.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    };
    prevBtn.addEventListener("click", () => track.scrollBy({ left: -stepSize(), behavior: smooth() }));
    nextBtn.addEventListener("click", () => track.scrollBy({ left: stepSize(), behavior: smooth() }));
    track.addEventListener("scroll", () => requestAnimationFrame(updateCarousel), { passive: true });
    window.addEventListener("resize", updateCarousel, { passive: true });
    updateCarousel();
  }

  /* ---- how far away (worked out on the visitor's device; nothing is sent anywhere) ---- */
  const hudDistance = $("[data-distance-hud]");
  const miles = (lat1, lng1, lat2, lng2) => {
    const rad = (d) => (d * Math.PI) / 180;
    const h = Math.sin(rad(lat2 - lat1) / 2) ** 2
      + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
    return 2 * 3958.8 * Math.asin(Math.sqrt(h));
  };
  // Once a distance is showing, the pill becomes a shortcut to Google Maps directions from where you are.
  let directionsUrl = null;
  const driveBtn = $(".lead__drive");
  const setDirections = (pos) => {
    const dest = encodeURIComponent(`${cafe.name}, ${a.street}, ${a.city}, ${a.region} ${a.postal}`);
    directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${pos.coords.latitude},${pos.coords.longitude}&destination=${dest}&travelmode=driving`;
    if (driveBtn) driveBtn.setAttribute("aria-label", `${hudDistance.textContent}. Open directions in Google Maps (opens in a new tab)`);
  };
  const showDistance = (pos) => {
    const mi = miles(pos.coords.latitude, pos.coords.longitude, cafe.coords.lat, cafe.coords.lng);
    if (mi < 0.05) hudDistance.textContent = "You're here. Come on in!";
    else if (mi > 300) hudDistance.textContent = `${Math.round(mi).toLocaleString()} mi away. Save us for your next Dallas trip`;
    else {
      const road = mi * 1.3;
      const drive = Math.max(1, Math.round((Math.min(road, 3) / 25) * 60 + (Math.max(0, road - 3) / 45) * 60 + 3));
      const t = drive < 60 ? `${drive} min` : `${Math.floor(drive / 60)} hr${drive % 60 ? ` ${drive % 60} min` : ""}`;
      hudDistance.textContent = `About a ${t} drive · ${mi < 10 ? mi.toFixed(1) : Math.round(mi).toLocaleString()} mi away`;
    }
    setDirections(pos);
  };
  const locate = () => {
    if (!("geolocation" in navigator)) { hudDistance.textContent = "Location is off on this browser"; return; }
    hudDistance.textContent = "Finding you…";
    navigator.geolocation.getCurrentPosition(showDistance, () => { hudDistance.textContent = "Location is off. Tap to try again"; },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 });
  };
  $$("[data-locate]").forEach((b) => b.addEventListener("click", () => {
    if (directionsUrl) window.open(directionsUrl, "_blank", "noopener");
    else locate();
  }));
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: "geolocation" }).then((st) => { if (st.state === "granted") locate(); }).catch(() => {});
  }

  /* ---- the flavor fan: the middle card is the pick, and it loops forever ---- */
  const hero = $("[data-hero]");
  const fan = $("[data-fan]");
  const cards = $$("[data-card]");
  const picked = $("[data-picked]");
  const n = cards.length;
  let at = cards.findIndex((c) => c.dataset.card === "jasmine");

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

  // Scrolling sideways over the cards (trackpad swipe, or shift + mouse wheel) turns them one card at a time.
  // Up-and-down scrolling is left alone so the page still scrolls normally.
  let swipe = 0;
  let swipeLockedUntil = 0;
  fan.addEventListener("wheel", (e) => {
    if (!e.target.closest(".fan__card")) return;
    const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
    if (Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY)) return;
    e.preventDefault();
    const now = performance.now();
    if (now < swipeLockedUntil) return;
    swipe += dx;
    if (Math.abs(swipe) >= 30) {
      step(swipe > 0 ? 1 : -1);
      swipe = 0;
      swipeLockedUntil = now + 350;
    }
  }, { passive: false });
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

  // The build-your-drink notes pop in once their row scrolls into view.
  const popRows = $$("[data-pop-in]");
  if ("IntersectionObserver" in window) {
    const popIo = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); popIo.unobserve(en.target); }
    }), { threshold: 0.3 });
    popRows.forEach((el) => popIo.observe(el));
  } else {
    popRows.forEach((el) => el.classList.add("is-in"));
  }

  // Headings that follow boxes of any height snap down onto the next row of the lined paper.
  const snapToRules = () => {
    $$("[data-snap-rule]").forEach((el) => {
      const paper = el.closest(".ph__inner");
      const rule = parseFloat(getComputedStyle(paper).getPropertyValue("--rule"));
      el.style.marginTop = "";
      const top = el.getBoundingClientRect().top - paper.getBoundingClientRect().top - paper.clientTop;
      const extra = (rule - (top % rule)) % rule;
      el.style.marginTop = `${parseFloat(getComputedStyle(el).marginTop) + (extra > rule - 1 ? 0 : extra)}px`;
    });
  };
  snapToRules();
  window.addEventListener("resize", snapToRules, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(snapToRules);

  render();
})();
