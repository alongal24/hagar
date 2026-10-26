(() => {
  const header = document.getElementById("siteHeader");

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
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
