(() => {
  const header = document.getElementById("siteHeader");
  const nav = document.getElementById("mainNav");
  const toggle = document.getElementById("menuToggle");
  const sections = document.querySelectorAll("main .panel");
  const navLinks = document.querySelectorAll(".main-nav a");

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "סגירת תפריט" : "פתיחת תפריט");
  };
  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${id}`;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-45% 0px -45% 0px" });
  sections.forEach((s) => sectionObserver.observe(s));

  // Section-by-section paging on desktop; phones keep native scrolling with CSS snap.
  const pagingQuery = window.matchMedia("(min-width: 961px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)");
  const root = document.documentElement;
  const motionStopped = () => root.classList.contains("a11y-motion");
  const pagingOn = () => pagingQuery.matches && !motionStopped();
  const panels = [...sections];
  let animating = false;
  let wheelQuietTimer;
  let wheelLocked = false;

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const animateTo = (target) => {
    target = Math.max(0, Math.min(target, root.scrollHeight - window.innerHeight));
    const start = window.scrollY;
    const distance = target - start;
    if (Math.abs(distance) < 2) return;
    const duration = Math.min(1100, 650 + Math.abs(distance) * 0.25);
    const t0 = performance.now();
    animating = true;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      window.scrollTo(0, start + distance * easeInOut(t));
      if (t < 1) requestAnimationFrame(step);
      else animating = false;
    };
    requestAnimationFrame(step);
  };

  const currentIndex = () => {
    const y = window.scrollY + 2;
    let index = 0;
    panels.forEach((p, i) => { if (p.offsetTop <= y) index = i; });
    return index;
  };

  // Returns the scroll target for one step, or null to let the browser scroll natively.
  const stepTarget = (dir) => {
    const vh = window.innerHeight;
    const y = window.scrollY;
    const i = currentIndex();
    const panel = panels[i];
    const top = panel.offsetTop;
    const bottom = top + panel.offsetHeight;
    const tall = panel.offsetHeight > vh + 4;

    if (dir > 0) {
      if (tall && y + vh < bottom - 4) return null;
      return i < panels.length - 1 ? panels[i + 1].offsetTop : null;
    }
    if (y > top + 4) return tall ? null : top;
    if (i === 0) return null;
    const prev = panels[i - 1];
    return prev.offsetHeight > vh + 4 ? prev.offsetTop + prev.offsetHeight - vh : prev.offsetTop;
  };

  const page = (dir) => {
    const target = stepTarget(dir);
    if (target === null) return false;
    animateTo(target);
    return true;
  };

  let wheelSum = 0;

  const onWheel = (e) => {
    if (panels.length < 2 || !pagingOn() || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    if (animating || wheelLocked) {
      e.preventDefault();
    } else if (stepTarget(Math.sign(e.deltaY)) !== null) {
      e.preventDefault();
      wheelSum += e.deltaY;
      if (Math.abs(wheelSum) >= 25) {
        page(Math.sign(wheelSum));
        wheelSum = 0;
        wheelLocked = true;
      }
    }
    // Trackpad inertia keeps firing wheel events; wait for a quiet gap before allowing the next step.
    clearTimeout(wheelQuietTimer);
    const release = () => {
      if (animating) wheelQuietTimer = setTimeout(release, 100);
      else { wheelLocked = false; wheelSum = 0; }
    };
    wheelQuietTimer = setTimeout(release, 180);
  };
  window.addEventListener("wheel", onWheel, { passive: false });

  window.addEventListener("keydown", (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if (panels.length < 2 || !pagingOn() || el?.closest("input, textarea, select, .a11y")) return;
    if (e.key === " " && el?.closest("button, a")) return;
    const down = ["PageDown", "ArrowDown", " "].includes(e.key) && !e.shiftKey;
    const up = ["PageUp", "ArrowUp"].includes(e.key) || (e.key === " " && e.shiftKey);
    if (!down && !up) return;
    if (animating) { e.preventDefault(); return; }
    if (page(down ? 1 : -1)) e.preventDefault();
  });

  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || link.classList.contains("skip-link") || !pagingOn()) return;
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    animateTo(target.offsetTop);
    history.replaceState(null, "", link.getAttribute("href"));
  });

  if (panels.length > 1) {
    const syncPaging = () => root.classList.toggle("is-paged", pagingOn());
    pagingQuery.addEventListener("change", syncPaging);
    document.addEventListener("a11ychange", syncPaging);
    syncPaging();
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  const quotes = document.querySelectorAll(".quote");
  const dotsWrap = document.getElementById("quoteDots");
  if (quotes.length && dotsWrap) {
    let current = 0;
    let timer;

    const showQuote = (i) => {
      current = (i + quotes.length) % quotes.length;
      quotes.forEach((q, n) => q.classList.toggle("is-active", n === current));
      dotsWrap.querySelectorAll("button").forEach((b, n) => b.setAttribute("aria-selected", String(n === current)));
    };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const startRotation = () => {
      clearInterval(timer);
      if (!reducedMotion.matches && !motionStopped()) timer = setInterval(() => showQuote(current + 1), 7000);
    };

    quotes.forEach((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", `המלצה ${i + 1}`);
      b.addEventListener("click", () => { showQuote(i); startRotation(); });
      dotsWrap.appendChild(b);
    });
    showQuote(0);
    startRotation();
    document.addEventListener("a11ychange", startRotation);
  }

  document.querySelectorAll(".faq-q").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      const willOpen = !item.classList.contains("is-open");
      item.parentElement.querySelectorAll(".faq-item").forEach((other) => {
        other.classList.remove("is-open");
        other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
        other.querySelector(".faq-a").hidden = true;
      });
      if (willOpen) {
        item.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
        item.querySelector(".faq-a").hidden = false;
      }
    });
  });

  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");
  if (form) form.addEventListener("submit", (e) => {
    e.preventDefault();
    const required = form.querySelectorAll("[required]");
    let valid = true;
    required.forEach((field) => {
      const ok = field.value.trim() !== "";
      field.classList.toggle("is-invalid", !ok);
      if (!ok) valid = false;
    });
    if (!valid) {
      status.textContent = "נא למלא שם וטלפון.";
      return;
    }
    const data = new FormData(form);
    const body = `שם: ${data.get("name")}\nטלפון: ${data.get("phone")}\n\n${data.get("message") || ""}`;
    window.location.href = `mailto:hello@example.com?subject=${encodeURIComponent("פנייה מהאתר")}&body=${encodeURIComponent(body)}`;
    status.textContent = "תודה! אחזור אלייך בהקדם.";
    form.reset();
  });

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
