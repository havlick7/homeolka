# HOMEolka

Samostatný statický web převedený z veřejné verze `www.homeolka.cz`.
HTML, styly, fotografie, logo, menu a právní dokumenty jsou v tomto repozitáři.
Pro návštěvníky nejsou potřeba Macaly, Next.js ani databáze Convex.

## Vývoj

Požadavky: Node.js 24, npm a Python 3.12.

```sh
npm ci
npm run build
npm run check:site
npm run serve
```

`npm run build` vytvoří celé nasazení v `dist/`, včetně obsahu, responzivních
WebP obrázků, SEO metadat, `robots.txt` a sitemapy. Zdrojové soubory nemění.
Po úpravách spusťte build znovu. Nasazujte pouze `dist/`, nikoliv kořen repozitáře.
V cloudovém prostředí použijte podle potřeby
`npm ci --cache /workspace/.npm-cache`.

## Úprava obsahu

- `content/site.json`: text o nás, poznámka k otevírání, kontakty, nadcházející
  a minulé akce, galerie. Veřejná konfigurace; neukládat hesla ani osobní údaje.
- `index.html`: šablona veřejné stránky a ostatní texty.
- `assets/media/`: originální lokální obrázky, logo a PDF. V konfiguraci používejte
  relativní cestu ve tvaru `./assets/media/soubor.png`.
- `assets/css/tailwind.css`: styly převzatého rozložení a přístupnosti.
- `assets/js/main.js`: mobilní menu, volby cookies a načtení mapy na vyžádání.

Pole `upcomingEvents` a `pastEvents` jsou explicitní seznamy; při skončení akce
ji přesuňte do minulých akcí. Datum má tvar `YYYY-MM-DD`. Fotografie galerie
obsahují `imageUrl`, `altText` a volitelný `instagramUrl`.
`openingHours` je zachované nastavení z původní administrace; původní veřejný web
jej nezobrazoval a kopie toto chování zachovává. Veřejně se zobrazuje `openingNote`.

`/admin/` vede na jednoduchou stránku s odkazem do GitHub editoru. Přihlášení a
oprávnění k úpravám zajišťuje GitHub. Původní přihlašovací backend Macaly se nepřenáší.
Změny nejprve odešlete v pull requestu; po kontrole a sloučení do `main` proběhne
automatické publikování na GitHub Pages.

## Kontroly

```sh
npm run check:js
npm run build
npm run check:site
npx playwright install --with-deps chromium
npm test
```

Pokud je Chromium již nainstalované v cloudovém prostředí:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm test
```

Testy ověřují obsah a obrázky při šířkách 390, 768 a 1440 px, ovládání mobilního
menu, souhlas s analytikou, mapu až po kliknutí, fungování bez JavaScriptu a se
zakázaným localStorage. Google Analytics a mapa jsou v příslušných testech nahrazeny
lokální odpovědí; neověřují dostupnost služby Google.
Snímky a případné chybové záznamy jsou v ignorovaném `artifacts/`.

## Nasazení

GitHub Pages používá `.github/workflows/deploy.yml` a nasazuje pouze po úspěšných
kontrolách. V Settings → Pages musí být zdroj **GitHub Actions**.
Výchozí adresa nasazení je `https://havlick7.github.io/homeolka/` a má `noindex`.

Po připojení domény nastavte proměnnou repozitáře `SITE_URL` na
`https://www.homeolka.cz/` a spusťte publikování znovu. Tím se aktualizují canonical,
sitemap a metadata a povolí indexace. Podrobný postup DNS je v `MIGRATION.md`.

Web lze stejně nasadit na Cloudflare Pages nebo jiný statický hosting:
`npm run build`, výstupní adresář `dist`. `SITE_URL` určuje veřejnou adresu;
`PREVIEW=true` zakáže indexaci testovacího sestavení.

## Optimalizace a soukromí

Texty, akce a galerie se vkládají do HTML už při sestavení a fungují i bez JS.
Obrázky mají rozměry, WebP varianty a `srcset`; úvodní fotografie má vysokou
prioritu, ostatní fotografie se načítají odloženě. Veškeré podklady jsou lokální.
Analytický skript se stáhne až po souhlasu. Mapu načte až samostatné kliknutí.
Systémové nastavení omezených animací se respektuje.

Původní web deklaroval fonty Montserrat a Cormorant Garamond, ale nenačítal jejich
fontové soubory. Pro vizuální shodu zůstává zachováno jeho skutečné vykreslování
s fallback fonty; případné zavedení webfontů je samostatná změna vzhledu.

## Původ podkladů

Veřejná stránka, styly a veřejná data byly zachyceny 14. 10. 2026.
`content/asset-sources.json` obsahuje původ veřejných podkladů; do nasazení se nekopíruje.
`scripts/import_public.py` je jednorázový migrační nástroj pro veřejné dotazy a
podklady. Není součástí běžného sestavení ani běhu webu. Opětovný import přepíše
konfiguraci pouze s explicitním `--refresh`; nepoužívejte jej pro běžné editace.
