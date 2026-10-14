# Přechod homeolka.cz mimo Macaly

## Přenesený obsah

Veřejná stránka má původní sekce, rozložení a grafiku. Lokálně je uložené logo,
ikony, úvodní fotografie, fotografie kávy, tři položky galerie, kompletní menu,
právní dokumenty a plakát minulé akce. Z veřejných dotazů původního webu jsou
převzata nastavení, šest minulých akcí a prázdný seznam nadcházejících akcí.
Původní administrační přihlášení nahrazuje úprava konfigurace přes GitHub.

## Ověření

- Sestavení a kontrola místních odkazů musí projít.
- Osm prohlížečových testů pokrývá obsah, mobilní ovládání, souhlasy a mapu.
- Při migraci byly porovnány snímky se živou veřejnou stránkou na šířkách
  390, 768 a 1440 px. Referenční stránka používala své původní HTML, CSS a JS,
  skutečné veřejné odpovědi Convex a stejné stažené originály obrázků.
  Node HTTPS klient ověřoval certifikáty; HTTP a WebSocket přenosy vedly přes
  proxy prostředí, protože prohlížeč sám nedůvěřoval její certifikační autoritě.
- Největší WebP varianty pěti rastrových obrázků mají dohromady přibližně 298 kB
  místo původních 1 036 kB. Změřené součty se vypisují při sestavení.
- Odkazy na Google Maps a analytický skript zůstávají externí. Jejich načítání
  vyžaduje akci návštěvníka. Build ani základní stránka Macaly nepotřebují.

## Hosting

V repozitáři již existoval GitHub Pages bez vlastní domény. Migrační verze používá
GitHub Actions a výstup `dist/`. Před přepnutím domény ověřit publikovanou verzi
na `https://havlick7.github.io/homeolka/`. Tato adresa má do připojení domény noindex.
Cloudflare Pages zůstává kompatibilní alternativou; není pro běh potřeba další účet.

## Přepnutí domény

DNS spravuje Forpsi. Podle zadání se nyní DNS ani doména nepřepínají; následující
postup je připravený pro pozdější termín.

1. Ve správě současného DNS exportovat všechny záznamy. Zaznamenat aktuální
   směrování apex domény a `www` pro návrat. Zachovat Macaly aktivní.
2. Ověřit vlastnictví `homeolka.cz` v GitHub Settings → Pages pomocí předepsaného
   TXT záznamu. Přesnou hodnotu vygeneruje GitHub pro účet; nevymýšlet ji.
3. V Settings → Pages repozitáře přidat vlastní doménu `www.homeolka.cz`.
4. Podle pokynů GitHub Pages nastavit `www` CNAME na `havlick7.github.io`.
   Pro apex `homeolka.cz` použít GitHubem aktuálně uváděné A/AAAA záznamy nebo
   poskytovatelem DNS podporovaný ALIAS. Ověřit případná omezení CAA pro HTTPS.
   Nekopírovat IP adresy starého hostingu. `www` a apex nesmí mít konfliktní záznamy.
5. Neměnit MX, SPF, DKIM, DMARC ani jiné služby. Pro samotný přesun webu není
   potřeba měnit registrátora ani nameservery.
6. Po ověření DNS a vystavení certifikátu zapnout Enforce HTTPS v GitHub Pages.
   Ověřit obě varianty adresy a přesměrování na `https://www.homeolka.cz/`.
7. Nastavit GitHub Actions repository variable `SITE_URL=https://www.homeolka.cz/`
   a spustit workflow Publish GitHub Pages. Ověřit canonical, sitemap a odstranění noindex.
8. Zkontrolovat stránku, obrázky, PDF, mobilní menu, souhlasy a e-mail.
9. Macaly ponechat dostupné několik dní. Až po stabilním provozu odpojit doménu
   a případně zrušit předplatné.

## Návrat

Při problému s DNS obnovit zaznamenané záznamy původního hostingu a ověřit HTTPS.
Při chybě v kódu vrátit migrační commit na GitHubu a nasadit předchozí ověřený
statický artefakt; původní kořen repozitáře nelze automaticky považovat za platný
výstup nového build procesu. Uchovat předchozí Pages deployment pro rollback.

Přepnutí DNS a publikování jsou samostatné operace. Samotný merge nebo úspěšný
build nepotvrzuje, že se doména přepnula. Skutečný stav nasazení a domény je nutné
ověřit HTTP požadavky a DNS kontrolou.
