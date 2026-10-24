(() => {
  const root = document.documentElement;
  const KEY = "a11y-settings";
  const SCALES = [1, 1.15, 1.3, 1.5];
  const OPTIONS = [
    ["contrast", "ניגודיות גבוהה", '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>'],
    ["grayscale", "גווני אפור", '<path d="M12 3.5c3.6 4.3 6 7.6 6 10.6a6 6 0 0 1-12 0c0-3 2.4-6.3 6-10.6z"/><path d="M12 3.5v16.6a6 6 0 0 1-6-6c0-3 2.4-6.3 6-10.6z" fill="currentColor"/>'],
    ["links", "הדגשת קישורים", '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'],
    ["font", "גופן קריא", '<path d="M3.5 19 8.5 5l5 14M5.3 14h6.4"/><circle cx="17" cy="16" r="3"/><path d="M20 12.5V19"/>'],
    ["motion", "עצירת אנימציות", '<circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/>'],
    ["cursor", "סמן גדול", '<path d="M6 3.5l12.5 9-5.6 1 3.1 6.2-2.5 1.3-3.1-6.2L6 19z"/>'],
  ];

  let settings = {};
  try { settings = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { settings = {}; }

  const level = () => Math.min(Math.max(Math.round(Number(settings.scale) || 0), 0), SCALES.length - 1);

  const NAV_BREAKPOINT = 960;
  const syncNav = () => root.classList.toggle("nav-compact", window.innerWidth <= NAV_BREAKPOINT * SCALES[level()]);

  const apply = () => {
    const scale = SCALES[level()];
    root.style.fontSize = scale === 1 ? "" : `${scale * 100}%`;
    OPTIONS.forEach(([id]) => root.classList.toggle(`a11y-${id}`, Boolean(settings[id])));
    syncNav();
  };
  apply();
  window.addEventListener("resize", syncNav);

  const icon = (paths) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;

  const build = () => {
    const widget = document.createElement("div");
    widget.className = "a11y";
    widget.innerHTML = `
      <button type="button" class="a11y-toggle" aria-expanded="false" aria-controls="a11yPanel" aria-label="תפריט נגישות">
        ${icon('<circle cx="12" cy="4.6" r="1.9" fill="currentColor" stroke="none"/><path d="M4.5 8.6c2.4.7 4.9 1 7.5 1s5.1-.3 7.5-1M12 9.6v4.6M12 14.2l-3.3 6.4M12 14.2l3.3 6.4"/>')}
      </button>
      <div class="a11y-panel" id="a11yPanel" role="dialog" aria-labelledby="a11yTitle">
        <div class="a11y-head">
          <p class="a11y-title" id="a11yTitle">תפריט נגישות</p>
          <button type="button" class="a11y-close" aria-label="סגירת תפריט הנגישות">${icon('<path d="M6 6l12 12M18 6 6 18"/>')}</button>
        </div>
        <div class="a11y-size" role="group" aria-labelledby="a11ySizeLabel">
          <span class="a11y-size-label" id="a11ySizeLabel">גודל טקסט</span>
          <span class="a11y-size-ctrl">
            <button type="button" data-size="-1" aria-label="הקטנת טקסט">−</button>
            <output aria-live="polite">100%</output>
            <button type="button" data-size="1" aria-label="הגדלת טקסט">+</button>
          </span>
        </div>
        <div class="a11y-grid">
          ${OPTIONS.map(([id, label, paths]) => `<button type="button" class="a11y-opt" data-opt="${id}" aria-pressed="false">${icon(paths)}<span>${label}</span></button>`).join("")}
        </div>
        <div class="a11y-foot">
          <button type="button" class="a11y-reset">${icon('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/>')}איפוס הגדרות</button>
          <a href="accessibility.html">הצהרת נגישות</a>
        </div>
      </div>`;
    document.body.appendChild(widget);

    const toggle = widget.querySelector(".a11y-toggle");
    const panel = widget.querySelector(".a11y-panel");
    const output = widget.querySelector("output");
    const [smaller, bigger] = widget.querySelectorAll("[data-size]");
    const optButtons = widget.querySelectorAll("[data-opt]");

    const render = () => {
      const l = level();
      output.textContent = `${Math.round(SCALES[l] * 100)}%`;
      smaller.setAttribute("aria-disabled", String(l === 0));
      bigger.setAttribute("aria-disabled", String(l === SCALES.length - 1));
      optButtons.forEach((b) => b.setAttribute("aria-pressed", String(Boolean(settings[b.dataset.opt]))));
    };

    const update = (next) => {
      settings = next;
      try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* storage unavailable */ }
      apply();
      render();
      document.dispatchEvent(new CustomEvent("a11ychange"));
    };

    const setOpen = (open, returnFocus) => {
      widget.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      if (open) panel.querySelector("button").focus();
      else if (returnFocus) toggle.focus();
    };

    toggle.addEventListener("click", () => setOpen(!widget.classList.contains("is-open"), true));
    widget.querySelector(".a11y-close").addEventListener("click", () => setOpen(false, true));
    [smaller, bigger].forEach((b) => b.addEventListener("click", () => {
      const l = Math.min(Math.max(level() + Number(b.dataset.size), 0), SCALES.length - 1);
      if (l !== level()) update({ ...settings, scale: l });
    }));
    optButtons.forEach((b) => b.addEventListener("click", () => {
      update({ ...settings, [b.dataset.opt]: !settings[b.dataset.opt] });
    }));
    widget.querySelector(".a11y-reset").addEventListener("click", () => update({}));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && widget.classList.contains("is-open")) setOpen(false, true);
    });
    document.addEventListener("click", (e) => {
      if (widget.classList.contains("is-open") && !widget.contains(e.target)) setOpen(false, false);
    });

    render();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
