(() => {
  const header = document.getElementById("siteHeader");

  const main = document.getElementById("main");
  const onScroll = () => header.classList.toggle("is-scrolled", Math.max(window.scrollY, main ? main.scrollTop : 0) > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  if (main) main.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Smooth snap scrolling (desktop) ---------- */
  (() => {
    const root = document.documentElement;
    if (root.classList.contains("page-doc")) return;

    const desktop = window.matchMedia("(min-width: 961px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const headerH = () => parseFloat(getComputedStyle(root).getPropertyValue("--header-h")) || 96;
    const motionOff = () => reduced.matches || root.classList.contains("a11y-motion");
    const active = () => desktop.matches && !motionOff();

    const syncMode = () => root.classList.toggle("js-snap", active());
    syncMode();
    desktop.addEventListener("change", syncMode);
    reduced.addEventListener("change", syncMode);
    new MutationObserver(syncMode).observe(root, { attributes: true, attributeFilter: ["class"] });

    const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);
    const clamp = (y) => Math.min(Math.max(y, 0), maxScroll());

    const points = () => {
      const vh = window.innerHeight;
      const h = headerH();
      const pts = [];
      document.querySelectorAll(".panel").forEach((sec) => {
        const top = clamp(sec.offsetTop - h);
        pts.push(top);
        const bottom = clamp(sec.offsetTop + sec.offsetHeight - vh);
        if (bottom - top > 24) pts.push(bottom);
      });
      pts.push(maxScroll());
      const sorted = [...new Set(pts.map(Math.round))].sort((a, b) => a - b);
      return sorted.filter((p, i) => i === 0 || p - sorted[i - 1] > 4);
    };

    let animating = false;
    let lockUntil = 0;
    const animateTo = (y) => {
      const start = window.scrollY;
      const dist = clamp(y) - start;
      if (Math.abs(dist) < 1) return;
      const dur = Math.min(900, Math.max(360, Math.abs(dist) * 0.5));
      const t0 = performance.now();
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      animating = true;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        window.scrollTo(0, start + dist * ease(t));
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          animating = false;
          lockUntil = performance.now() + 140;
        }
      };
      requestAnimationFrame(step);
    };

    const go = (dir) => {
      const pts = points();
      const y = window.scrollY;
      const target = dir > 0 ? pts.find((p) => p > y + 4) : [...pts].reverse().find((p) => p < y - 4);
      if (target == null) return false;
      animateTo(target);
      return true;
    };

    window.addEventListener("wheel", (e) => {
      if (!active() || e.ctrlKey) return;
      if (e.target.closest && e.target.closest(".a11y-panel, textarea")) return;
      e.preventDefault();
      if (animating || performance.now() < lockUntil) return;
      go(Math.sign(e.deltaY));
    }, { passive: false });

    window.addEventListener("keydown", (e) => {
      if (!active()) return;
      const tag = (e.target.tagName || "").toLowerCase();
      if (e.target.isContentEditable || tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "PageDown" || e.key === "ArrowDown" || (e.key === " " && !e.shiftKey)) {
        if (go(1)) e.preventDefault();
      } else if (e.key === "PageUp" || e.key === "ArrowUp" || (e.key === " " && e.shiftKey)) {
        if (go(-1)) e.preventDefault();
      } else if (e.key === "Home") {
        animateTo(0); e.preventDefault();
      } else if (e.key === "End") {
        animateTo(maxScroll()); e.preventDefault();
      }
    });

    let touchY = null;
    window.addEventListener("touchstart", (e) => {
      touchY = active() ? e.touches[0].clientY : null;
    }, { passive: true });
    window.addEventListener("touchend", (e) => {
      if (touchY == null) return;
      const dy = touchY - e.changedTouches[0].clientY;
      touchY = null;
      if (Math.abs(dy) > 44 && !animating && performance.now() >= lockUntil) go(Math.sign(dy));
    }, { passive: true });

    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      if (a.classList.contains("js-phone") || a.classList.contains("js-whatsapp")) return;
      a.addEventListener("click", (e) => {
        if (!active()) return;
        const id = a.getAttribute("href").slice(1);
        const el = id && document.getElementById(id);
        if (!el) return;
        e.preventDefault();
        animateTo(el.offsetTop - headerH());
      });
    });
  })();

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");
  const statusText = document.getElementById("formStatusText");
  const EMAIL = "hagar.stam@gmail.com";

  const setStatus = (message, kind) => {
    if (!status) return;
    status.classList.toggle("is-error", kind === "error");
    status.classList.toggle("is-success", kind === "success");
    if (statusText) statusText.textContent = message || "";
  };

  const setFieldError = (input, message) => {
    const error = document.getElementById(input.getAttribute("aria-describedby"));
    input.classList.toggle("is-invalid", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (error) error.textContent = message || "";
  };

  const validateName = (value) => {
    const name = value.trim().replace(/\s+/g, " ");
    if (!name) return "נא למלא שם.";
    if (name.length < 2) return "השם קצר מדי.";
    if (!/^[\p{L}][\p{L}\s'’.\-״׳"]*$/u.test(name)) return "השם יכול להכיל אותיות בלבד.";
    return "";
  };

  const normalizePhone = (value) => {
    let phone = value.trim().replace(/[\s().-]/g, "");
    if (phone.startsWith("+")) phone = phone.slice(1);
    if (phone.startsWith("00")) phone = phone.slice(2);
    if (phone.startsWith("972")) phone = "0" + phone.slice(3);
    return phone;
  };

  const validatePhone = (value) => {
    if (!value.trim()) return "נא למלא מספר טלפון.";
    if (!/^0(5\d|[23489]|7[2-9])\d{7}$/.test(normalizePhone(value))) return "נראה שמספר הטלפון אינו תקין.";
    return "";
  };

  const validateMessage = (value) => value.length > 1000 ? "ההודעה ארוכה מדי." : "";

  if (status && new URLSearchParams(location.search).get("sent") === "1") {
    setStatus("תודה! הפנייה נשלחה ואחזור אלייך בהקדם.", "success");
    const contact = document.getElementById("contact");
    if (contact) contact.scrollIntoView();
    const params = new URLSearchParams(location.search);
    params.delete("sent");
    const query = params.toString();
    history.replaceState(null, "", location.pathname + (query ? "?" + query : "") + location.hash);
  }

  const RECAPTCHA_SITE_KEY = "6Le8gA0uAAAAAAsqQazYLkG26uKJkdckzzgj4abd";
  const captchaErrorEl = document.getElementById("captchaError");

  const setCaptchaError = (message) => {
    if (captchaErrorEl) captchaErrorEl.textContent = message || "";
  };

  const recaptchaToken = () => new Promise((resolve, reject) => {
    if (!window.grecaptcha) {
      reject(new Error("recaptcha missing"));
      return;
    }
    window.grecaptcha.ready(() => {
      window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: "contact" }).then(resolve, reject);
    });
  });

  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.elements.name;
    const phone = form.elements.phone;
    const message = form.elements.message;
    const honey = form.elements._honey;
    const nameError = validateName(name.value);
    const phoneError = validatePhone(phone.value);
    const messageError = validateMessage(message.value);
    setFieldError(name, nameError);
    setFieldError(phone, phoneError);
    setFieldError(message, messageError);
    setCaptchaError("");

    const firstInvalid = [name, phone, message].find((field, index) => [nameError, phoneError, messageError][index]);
    if (firstInvalid) {
      setStatus("יש לתקן את השדות המסומנים.", "error");
      firstInvalid.focus();
      return;
    }
    if (honey && honey.value) {
      setStatus("השליחה לא הצליחה. אפשר להתקשר או לכתוב אל " + EMAIL + ".", "error");
      return;
    }

    const submitButton = form.querySelector("[type=submit]");
    submitButton.disabled = true;
    setStatus("שולחים…");
    let token = "";
    try {
      token = await recaptchaToken();
    } catch {
      token = "";
    }
    if (!token) {
      setCaptchaError("האימות לא נטען. רעננו את העמוד.");
      setStatus("האימות לא נטען. רעננו את העמוד.", "error");
      submitButton.disabled = false;
      return;
    }
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: name.value.trim().replace(/\s+/g, " "),
          phone: normalizePhone(phone.value),
          message: message.value.trim(),
          token
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        const error = new Error(data.error === "captcha" ? "captcha" : "send");
        throw error;
      }
      const mail = await fetch("https://formsubmit.co/ajax/" + EMAIL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: "פנייה חדשה מהאתר",
          _template: "table",
          _captcha: "false",
          name: name.value.trim().replace(/\s+/g, " "),
          phone: normalizePhone(phone.value),
          message: message.value.trim() || "—"
        })
      });
      const mailData = await mail.json().catch(() => ({}));
      const queued = typeof mailData.message === "string" && /activ/i.test(mailData.message);
      const accepted = mailData.success === true || mailData.success === "true" || queued;
      if (!mail.ok || !accepted) throw new Error("send");
      form.reset();
      setStatus("תודה! הפנייה נשלחה ואחזור אלייך בהקדם.", "success");
    } catch (error) {
      if (error && error.message === "captcha") {
        setCaptchaError("האימות נכשל. נסו שוב, או התקשרו.");
        setStatus("האימות נכשל. נסו שוב, או התקשרו.", "error");
      } else {
        setStatus("השליחה לא הצליחה. אפשר להתקשר או לכתוב אל " + EMAIL + ".", "error");
      }
    } finally {
      submitButton.disabled = false;
    }
  });

  [form && form.elements.name, form && form.elements.phone, form && form.elements.message].forEach((field) => {
    if (!field) return;
    field.addEventListener("input", () => {
      if (field.classList.contains("is-invalid")) setFieldError(field, "");
    });
  });

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const phoneDigits = String.fromCharCode(48, 53, 52, 55, 57, 53, 52, 49, 55, 57);
  const phoneText = phoneDigits.slice(0, 3) + "-" + phoneDigits.slice(3, 6) + "-" + phoneDigits.slice(6);
  const phoneIntl = String.fromCharCode(57, 55, 50) + phoneDigits.slice(1);
  document.querySelectorAll(".js-phone").forEach((link) => {
    link.textContent = phoneText;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      location.href = "tel:+" + phoneIntl;
    });
  });
  document.querySelectorAll(".js-whatsapp").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      window.open("https://wa.me/" + phoneIntl, "_blank", "noopener");
    });
  });
})();
