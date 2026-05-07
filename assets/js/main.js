    const GA_MEASUREMENT_ID = 'G-9SHFK2QYSL';
    const CONSENT_STORAGE_KEY = 'homeolka_cookie_consent_v1';
    const MAP_CONSENT_STORAGE_KEY = 'homeolka_map_consent_v1';
    const CONSENT_MAX_AGE_DAYS = 180;
    let gaConfigured = false;
    const DEFAULT_INSTAGRAM_LINK = 'https://instagram.com/homeolka';
    const MAP_IFRAME_HTML = `
        <iframe
          title="Mapa: homeolka"
          src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d620.5692139335355!2d14.052242431463364!3d49.961528049553834!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1scs!2scz!4v1774994601966!5m2!1scs!2scz"
          class="w-full h-56 md:h-80"
          style="border:0;"
          loading="lazy"
          allowfullscreen
          referrerpolicy="no-referrer-when-downgrade">
        </iframe>
      `;

    function getConsentMaxAgeMs() {
      return CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    }

    function readStoredJson(key) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return null;
      }
    }

    function showCookieBanner() {
      const banner = document.getElementById('cookieBanner');
      if (banner) banner.classList.remove('hidden');
    }

    function hideCookieBanner() {
      const banner = document.getElementById('cookieBanner');
      if (banner) banner.classList.add('hidden');
    }

    function saveConsent(status) {
      const payload = {
        status,
        ts: Date.now()
      };
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload));
    }

    function readConsent() {
      try {
        const parsed = readStoredJson(CONSENT_STORAGE_KEY);
        if (!parsed?.status || !parsed?.ts) return null;

        const maxAgeMs = getConsentMaxAgeMs();
        if (Date.now() - parsed.ts > maxAgeMs) {
          localStorage.removeItem(CONSENT_STORAGE_KEY);
          return null;
        }

        return parsed.status;
      } catch (error) {
        console.error('Nepodařilo se přečíst cookie consent stav:', error);
        return null;
      }
    }

    function saveMapConsent() {
      const payload = { granted: true, ts: Date.now() };
      localStorage.setItem(MAP_CONSENT_STORAGE_KEY, JSON.stringify(payload));
    }

    function readMapConsent() {
      try {
        const parsed = readStoredJson(MAP_CONSENT_STORAGE_KEY);
        if (!parsed?.granted || !parsed?.ts) return false;

        const maxAgeMs = getConsentMaxAgeMs();
        if (Date.now() - parsed.ts > maxAgeMs) {
          localStorage.removeItem(MAP_CONSENT_STORAGE_KEY);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Nepodařilo se přečíst map consent stav:', error);
        return false;
      }
    }

    function clearMapConsent() {
      localStorage.removeItem(MAP_CONSENT_STORAGE_KEY);
    }

    function applyConsent(status) {
      const granted = status === 'accepted';

      gtag('consent', 'update', {
        analytics_storage: granted ? 'granted' : 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });

      if (granted && !gaConfigured) {
        gtag('config', GA_MEASUREMENT_ID);
        gaConfigured = true;
      }
    }

    function acceptAll() {
      saveConsent('accepted');
      applyConsent('accepted');
      hideCookieBanner();
    }

    function rejectAll() {
      saveConsent('rejected');
      clearMapConsent();
      applyConsent('rejected');
      hideCookieBanner();
    }

    function openCookieSettings() {
      showCookieBanner();
    }

    function initConsent() {
      const consent = readConsent();
      if (!consent) {
        showCookieBanner();
        return;
      }

      applyConsent(consent);
      hideCookieBanner();
    }

    function loadMap(persistConsent = true) {
      const mapContainer = document.getElementById('mapContainer');
      if (!mapContainer) return;

      if (persistConsent) {
        saveMapConsent();
      }

      mapContainer.innerHTML = MAP_IFRAME_HTML;
    }

    function renderInstagramFallback(count = 3) {
      const grid = document.getElementById('instagramGrid');
      if (!grid) return;
      grid.innerHTML = Array.from({ length: count }).map(() => `
        <div class="aspect-square rounded-xl bg-gray-200 flex items-center justify-center text-gray-500 soft-shadow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="w-7 h-7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>
        </div>
      `).join('');
    }

    async function loadContent() {
      try {
        const response = await fetch('./site-content.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const content = await response.json();
        Object.keys(content).forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.textContent = content[id];
        });
      } catch (error) {
        console.error('Nepodařilo se načíst obsah ze site-content.json:', error);
      }
    }

    async function loadInstagramFeed() {
      const grid = document.getElementById('instagramGrid');
      if (!grid) return;

      try {
        const response = await fetch('./assets/instagram/instagram-feed.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const items = await response.json();
        const visibleItems = (Array.isArray(items) ? items : [])
          .filter((item) => item && item.src)
          .slice(0, 6);

        if (visibleItems.length === 0) {
          renderInstagramFallback(3);
          return;
        }

        grid.innerHTML = visibleItems.map((item) => `
          <a href="${item.link || DEFAULT_INSTAGRAM_LINK}" target="_blank" rel="noreferrer" class="group block rounded-xl overflow-hidden soft-shadow bg-gray-200">
            <div class="aspect-square relative">
              <img src="${item.src}" alt="${item.alt || 'Instagram fotka'}" loading="lazy" class="w-full h-full object-cover transition duration-300 group-hover:scale-[1.02]" onerror="this.closest('a').remove();" />
            </div>
          </a>
        `).join('');

        if (!grid.children.length) {
          renderInstagramFallback(3);
        }
      } catch (error) {
        console.error('Nepodařilo se načíst assets/instagram/instagram-feed.json:', error);
        renderInstagramFallback(3);
      }
    }


    function bindUIActions() {
      document.getElementById('loadMapBtn')?.addEventListener('click', () => loadMap());
      document.getElementById('openCookieSettingsBtn')?.addEventListener('click', openCookieSettings);
      document.getElementById('rejectAllBtn')?.addEventListener('click', rejectAll);
      document.getElementById('acceptAllBtn')?.addEventListener('click', acceptAll);
    }

    function initApp() {
      bindUIActions();
      initConsent();
      if (readMapConsent()) {
        loadMap(false);
      }
      loadContent();
      loadInstagramFeed();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
    } else {
      initApp();
    }
