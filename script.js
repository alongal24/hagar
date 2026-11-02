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
  const captchaCanvas = document.getElementById("captchaCanvas");
  const captchaInput = document.getElementById("captchaInput");
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const SPOKEN = {
    A: "איי", B: "בי", C: "סי", D: "די", E: "אי", F: "אף", G: "ג׳י", H: "אייץ׳",
    J: "ג׳יי", K: "קיי", L: "אל", M: "אם", N: "אן", P: "פי", Q: "קיו", R: "אר",
    S: "אס", T: "טי", U: "יו", V: "וי", W: "דאבליו", X: "אקס", Y: "וואי", Z: "זד",
    2: "שתיים", 3: "שלוש", 4: "ארבע", 5: "חמש", 6: "שש", 7: "שבע", 8: "שמונה", 9: "תשע"
  };
  let captchaAnswer = "";
  let captchaExpires = 0;
  let captchaMisses = 0;
  let captchaLockedUntil = 0;

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

  const codesMatch = (typed, expected) => {
    const a = typed.toUpperCase();
    const b = expected.toUpperCase();
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  };

  const drawCaptcha = (text) => {
    const canvas = captchaCanvas;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const styles = getComputedStyle(document.documentElement);
    const bg = styles.getPropertyValue("--bg").trim() || "#fffaf6";
    const ink = styles.getPropertyValue("--ink").trim() || "#1d2b36";
    const rose = styles.getPropertyValue("--rose").trim() || "#b0707f";
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = i % 2 ? rose : ink;
      ctx.globalAlpha = 0.18 + Math.random() * 0.2;
      ctx.lineWidth = 1 + Math.random() * 1.4;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width, Math.random() * height,
        Math.random() * width, Math.random() * height,
        Math.random() * width, Math.random() * height
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    text.split("").forEach((char, index) => {
      ctx.save();
      ctx.translate(22 + index * 38, 42 + (Math.random() * 10 - 5));
      ctx.rotate((Math.random() - 0.5) * 0.7);
      ctx.font = `${600 + Math.floor(Math.random() * 200)} ${26 + Math.random() * 8}px Assistant, sans-serif`;
      ctx.fillStyle = Math.random() > 0.35 ? ink : rose;
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });

    const image = ctx.getImageData(0, 0, width, height);
    const source = new Uint8ClampedArray(image.data);
    for (let y = 0; y < height; y++) {
      const shift = Math.round(Math.sin(y / 7) * 3);
      for (let x = 0; x < width; x++) {
        const from = Math.min(width - 1, Math.max(0, x + shift));
        const dest = (y * width + x) * 4;
        const origin = (y * width + from) * 4;
        image.data[dest] = source[origin];
        image.data[dest + 1] = source[origin + 1];
        image.data[dest + 2] = source[origin + 2];
        image.data[dest + 3] = source[origin + 3];
      }
    }
    ctx.putImageData(image, 0, 0);

    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? ink : rose;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
  };

  const refreshCaptcha = () => {
    captchaAnswer = Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
    captchaExpires = Date.now() + 3 * 60 * 1000;
    if (captchaInput) captchaInput.value = "";
    if (captchaCanvas) drawCaptcha(captchaAnswer);
  };

  const validateCaptcha = () => {
    if (Date.now() < captchaLockedUntil) return "יותר מדי ניסיונות. נסו שוב בעוד רגע.";
    const typed = captchaInput.value.replace(/\s+/g, "");
    if (!typed) return "נא להקליד את קוד האימות.";
    if (Date.now() > captchaExpires) {
      refreshCaptcha();
      return "תוקף הקוד פג. הופיע קוד חדש.";
    }
    if (!codesMatch(typed, captchaAnswer)) {
      captchaMisses += 1;
      if (captchaMisses >= 4) {
        captchaMisses = 0;
        captchaLockedUntil = Date.now() + 15000;
        refreshCaptcha();
        return "יותר מדי ניסיונות. נסו שוב בעוד רגע.";
      }
      return "הקוד לא תואם. נסו שוב.";
    }
    return "";
  };

  if (captchaCanvas) refreshCaptcha();

  const refreshButton = document.getElementById("captchaRefresh");
  if (refreshButton) refreshButton.addEventListener("click", () => {
    captchaMisses = 0;
    refreshCaptcha();
    if (captchaInput) setFieldError(captchaInput, "");
  });

  const audioButton = document.getElementById("captchaAudio");
  if (audioButton) audioButton.addEventListener("click", () => {
    if (!captchaAnswer || !window.speechSynthesis) {
      status.textContent = "הדפדפן לא תומך בהקראת הקוד.";
      status.classList.add("is-error");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(captchaAnswer.split("").map((char) => SPOKEN[char] || char).join(" , "));
    utterance.lang = "he-IL";
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
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
    const captchaError = captchaInput ? validateCaptcha() : "";
    setFieldError(name, nameError);
    setFieldError(phone, phoneError);
    setFieldError(message, messageError);
    if (captchaInput) setFieldError(captchaInput, captchaError);

    const firstInvalid = [name, phone, message, captchaInput].find((field, index) => {
      return [nameError, phoneError, messageError, captchaError][index];
    });
    if (firstInvalid) {
      status.textContent = "יש לתקן את השדות המסומנים.";
      status.classList.add("is-error");
      firstInvalid.focus();
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
      captchaMisses = 0;
      refreshCaptcha();
      status.classList.remove("is-error");
      status.textContent = "תודה! הפנייה נשלחה ואחזור אלייך בהקדם.";
    } catch {
      status.classList.add("is-error");
      status.textContent = "השליחה לא הצליחה. אפשר להתקשר או לכתוב אל " + EMAIL + ".";
    } finally {
      submitButton.disabled = false;
    }
  });

  [form && form.elements.name, form && form.elements.phone, form && form.elements.message, captchaInput].forEach((field) => {
    if (!field) return;
    field.addEventListener("input", () => {
      if (field.classList.contains("is-invalid")) setFieldError(field, "");
    });
  });

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
