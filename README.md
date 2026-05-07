# homeolka

Jednoduchá statická prezentační stránka pro foodtruck HOMEolka.

## Úprava obsahu
- Hlavní texty upravujte v `site-content.json`.
- Statický Instagram feed upravujte v `assets/instagram/instagram-feed.json`.

## Styly (single source of truth)
- Web načítá pouze `assets/css/main.css` z `index.html`.
- `assets/css/main.css` je build output z `assets/css/tailwind.css`.
- Pro změnu stylů upravujte `assets/css/tailwind.css` a pak spusťte build.

## Skripty
- `npm run build:css` – jednorázový build CSS.
- `npm run watch:css` – průběžný build při změnách.
- `npm run check:js` – syntax check JavaScriptu.

## Poznámky
- Analytics (GA4) + cookie banner zůstávají aktivní.
- Google mapa se načítá až po kliknutí (a volba se ukládá lokálně).
