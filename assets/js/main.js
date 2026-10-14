(() => {
  "use strict";
  const consentKey = "homeolka_cookie_consent";
  const header = document.querySelector("#site-header");
  const menuButton = document.querySelector("#menu-toggle");
  const menu = document.querySelector("#mobile-menu");
  const banner = document.querySelector("#cookie-banner");
  const getConsent = () => {
    try {
      return localStorage.getItem(consentKey);
    } catch {
      return null;
    }
  };
  const saveConsent = (value) => {
    try {
      localStorage.setItem(consentKey, value);
    } catch {
      /* The controls still work without storage. */
    }
  };
  let analyticsStarted = false;
  const startAnalytics = () => {
    if (analyticsStarted) return;
    analyticsStarted = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("js", new Date());
    window.gtag("config", "G-9SHFK2QYSL");
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-9SHFK2QYSL";
    document.head.append(script);
  };
  const setMenu = (open) => {
    if (!menu || !menuButton) return;
    menu.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Zavřít menu" : "Menu");
    const bars = menuButton.children;
    bars[0].style.transform = open ? "rotate(45deg) translateY(8px)" : "none";
    bars[1].style.opacity = open ? "0" : "1";
    bars[2].style.transform = open ? "rotate(-45deg) translateY(-8px)" : "none";
  };
  const updateHeader = () => {
    const scrolled = window.scrollY > 20;
    for (const name of ["glass", "border-b", "border-border", "shadow-sm"])
      header?.classList.toggle(name, scrolled);
    header?.classList.toggle("bg-transparent", !scrolled);
  };
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
  menuButton?.addEventListener("click", () => setMenu(menu.hidden));
  menu?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu && !menu.hidden) {
      setMenu(false);
      menuButton.focus();
    }
  });
  window
    .matchMedia("(min-width: 768px)")
    .addEventListener("change", (event) => {
      if (event.matches) setMenu(false);
    });
  const showPrivacy = () => {
    if (banner) banner.hidden = false;
  };
  document
    .querySelector("#privacy-settings")
    ?.addEventListener("click", showPrivacy);
  let consent = getConsent();
  if (consent === "accepted") startAnalytics();
  else if (consent !== "rejected") setTimeout(showPrivacy, 1500);
  document.querySelector("#accept-cookies")?.addEventListener("click", () => {
    consent = "accepted";
    saveConsent(consent);
    startAnalytics();
    window.gtag?.("consent", "update", { analytics_storage: "granted" });
    banner.hidden = true;
  });
  document.querySelector("#reject-cookies")?.addEventListener("click", () => {
    consent = "rejected";
    saveConsent(consent);
    window.gtag?.("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    banner.hidden = true;
    // Remove this site's GA cookies when consent is withdrawn.
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.trim().split("=")[0];
      if (!/^_ga(?:_|$)/.test(name)) continue;
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      const parts = location.hostname.split(".");
      while (parts.length > 1) {
        document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${parts.join(".")}; SameSite=Lax`;
        parts.shift();
      }
    }
  });
  document.querySelector("#load-map")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    const frame = document.createElement("iframe");
    frame.src =
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d941.4377538060963!2d14.051478419073279!3d49.961539782229295!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x470ba53f069e2ea9%3A0xe821dfa29b151c7e!2zSE9NRW9sa2EgLSBrw6F2YSwgZHJpbmt5LCBvYsSNZXJzdHZlbsOt!5e1!3m2!1scs!2scz!4v1779739865295!5m2!1scs!2scz";
    frame.title = "HOMEolka – mapa";
    frame.className = "map-frame";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "no-referrer-when-downgrade";
    button.replaceWith(frame);
    frame.focus();
  });
})();
