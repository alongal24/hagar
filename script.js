(() => {
  const header = document.getElementById("siteHeader");

  const main = document.getElementById("main");
  const onScroll = () => header.classList.toggle("is-scrolled", Math.max(window.scrollY, main ? main.scrollTop : 0) > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  if (main) main.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

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
  const EMAIL = "hagar.stam@gmail.com";

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
    status.classList.remove("is-error");
    status.textContent = "תודה! הפנייה נשלחה ואחזור אלייך בהקדם.";
    const contact = document.getElementById("contact");
    if (contact) contact.scrollIntoView();
    const params = new URLSearchParams(location.search);
    params.delete("sent");
    const query = params.toString();
    history.replaceState(null, "", location.pathname + (query ? "?" + query : "") + location.hash);
  }

  const RECAPTCHA_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
  const captchaErrorEl = document.getElementById("captchaError");
  let recaptchaId = null;

  const setCaptchaError = (message) => {
    if (captchaErrorEl) captchaErrorEl.textContent = message || "";
  };

  window.onRecaptchaLoad = () => {
    const box = document.getElementById("recaptcha");
    if (!box || recaptchaId !== null || !window.grecaptcha) return;
    recaptchaId = window.grecaptcha.render(box, {
      sitekey: RECAPTCHA_SITE_KEY,
      hl: "he",
      callback: () => setCaptchaError("")
    });
  };

  const captchaMessage = () => {
    if (!window.grecaptcha || recaptchaId === null) return "האימות לא נטען. רעננו את העמוד.";
    return window.grecaptcha.getResponse(recaptchaId) ? "" : "נא לאשר שאינך רובוט.";
  };

  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.elements.name;
    const phone = form.elements.phone;
    const message = form.elements.message;
    const honey = form.elements._honey;
    const nameError = validateName(name.value);
    const phoneError = validatePhone(phone.value);
    const messageError = validateMessage(message.value);
    const captchaError = captchaMessage();
    setFieldError(name, nameError);
    setFieldError(phone, phoneError);
    setFieldError(message, messageError);
    setCaptchaError(captchaError);

    const firstInvalid = [name, phone, message].find((field, index) => [nameError, phoneError, messageError][index]);
    if (firstInvalid || captchaError) {
      status.textContent = "יש לתקן את השדות המסומנים.";
      status.classList.add("is-error");
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    if (honey && honey.value) {
      status.textContent = "השליחה לא הצליחה. אפשר להתקשר או לכתוב אל " + EMAIL + ".";
      status.classList.add("is-error");
      return;
    }

    const submitButton = form.querySelector("[type=submit]");
    submitButton.disabled = true;
    status.classList.remove("is-error");
    status.textContent = "שולחים…";
    try {
      const response = await fetch("https://formsubmit.co/ajax/" + EMAIL, {
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
      const data = await response.json().catch(() => ({}));
      const queued = typeof data.message === "string" && /activ/i.test(data.message);
      const accepted = data.success === true || data.success === "true" || queued;
      if (!response.ok || !accepted) throw new Error("send failed");
      form.reset();
      if (window.grecaptcha && recaptchaId !== null) window.grecaptcha.reset(recaptchaId);
      status.classList.remove("is-error");
      status.textContent = "תודה! הפנייה נשלחה ואחזור אלייך בהקדם.";
    } catch {
      status.classList.add("is-error");
      status.textContent = "השליחה לא הצליחה. אפשר להתקשר או לכתוב אל " + EMAIL + ".";
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
