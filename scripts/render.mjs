import { parseHTML } from "linkedom";

const escape = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
const safeLink = (value, fallback = "#") => {
  if (!value) return fallback;
  if (/^(https?:\/\/|mailto:|\.\/assets\/)/i.test(value)) return value;
  throw new Error(`Unsupported link: ${value}`);
};
const date = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error(`Invalid event date: ${value}`);
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Prague",
  });
};

export function render(source, content, siteURL) {
  const { document } = parseHTML(source);
  const { settings, upcomingEvents, pastEvents, gallery } = content;
  if (
    !settings ||
    ![upcomingEvents, pastEvents, gallery].every(Array.isArray)
  ) {
    throw new Error(
      "Public content snapshot is incomplete. Run the explicit migration import first.",
    );
  }
  for (const element of document.querySelectorAll("[data-content]")) {
    const value = settings[element.dataset.content];
    if (value !== undefined) element.textContent = value;
  }
  for (const link of document.querySelectorAll("a")) {
    if (
      link.getAttribute("href") === "mailto:info@homeolka.cz" &&
      settings.contactEmail
    ) {
      if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(settings.contactEmail))
        throw new Error("Invalid contact email");
      link.href = `mailto:${settings.contactEmail}`;
      link.textContent = link.textContent.replace(
        "info@homeolka.cz",
        settings.contactEmail,
      );
    }
    for (const [original, key] of [
      ["https://www.instagram.com/homeolka", "instagramUrl"],
      ["https://www.facebook.com/homeolka", "facebookUrl"],
    ]) {
      if (link.getAttribute("href") === original && settings[key])
        link.href = safeLink(settings[key]);
    }
  }
  const events = document.querySelector("#events-list");
  events.className = upcomingEvents.length
    ? "grid sm:grid-cols-2 gap-6 mb-16"
    : "rounded-3xl border border-dashed border-border p-12 text-center mb-16";
  events.innerHTML = upcomingEvents.length
    ? upcomingEvents
        .map(
          (item) => `
    <article class="group rounded-3xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-background">
      ${item.imageUrl ? `<div class="aspect-video overflow-hidden"><img src="${escape(safeLink(item.imageUrl))}" alt="${escape(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async"></div>` : ""}
      <div class="p-6"><div class="flex items-center gap-2 mb-3 flex-wrap">
        <span class="font-body text-xs font-600 tracking-wider uppercase px-3 py-1 rounded-full" style="background:hsl(var(--brand-coral) / 0.1);color:hsl(var(--brand-coral))">${escape(date(item.date))}</span>
        ${item.time ? `<span class="font-body text-xs font-600 tracking-wider px-3 py-1 rounded-full" style="background:hsl(var(--brand-wine) / 0.08);color:hsl(var(--brand-wine))">${escape(item.time)}</span>` : ""}
      </div><h3 class="font-display text-2xl font-medium text-brand-wine mb-1">${escape(item.title)}</h3>
      <p class="font-body text-xs text-foreground/50 mb-3 flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>${escape(item.location)}</p>
      <p class="font-body text-sm text-foreground/60 leading-relaxed">${escape(item.description)}</p>
      ${item.externalLink ? `<a href="${escape(safeLink(item.externalLink))}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-body text-xs font-600 text-brand-coral hover:underline mt-4">Více info →</a>` : ""}</div>
    </article>`,
        )
        .join("")
    : '<p class="font-display text-3xl font-light text-brand-wine/40 mb-2">Brzy tady budou nové akce</p><p class="font-body text-sm text-foreground/40">Sledujte nás na Instagramu pro novinky</p>';
  if (pastEvents.length) {
    const past = document.createElement("div");
    past.id = "past-events";
    past.innerHTML = `<h3 class="font-display text-2xl font-light text-brand-wine/50 mb-6 text-center">Kde jsme už byli</h3><div class="flex flex-wrap gap-3 justify-center">${pastEvents.map((item) => `<div class="rounded-full px-5 py-2 border border-border text-foreground/50 font-body text-sm">${escape(item.title)} · ${escape(date(item.date))}</div>`).join("")}</div>`;
    events.after(past);
  }
  const grid = document.querySelector("#gallery-list");
  grid.className = gallery.length
    ? "grid gap-3 sm:grid-cols-3 grid-cols-3"
    : "rounded-3xl border border-dashed border-border p-12 text-center mb-8";
  const instagram = document.querySelector("#instagram a svg").cloneNode(true);
  instagram.setAttribute("width", "28");
  instagram.setAttribute("height", "28");
  instagram.setAttribute("fill", "white");
  instagram.setAttribute("aria-hidden", "true");
  instagram.setAttribute(
    "class",
    "opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-75 group-hover:scale-100",
  );
  grid.innerHTML = gallery.length
    ? gallery
        .map(
          (item) =>
            `<a href="${escape(safeLink(item.instagramUrl || settings.instagramUrl))}" target="_blank" rel="noopener noreferrer" class="group relative aspect-square rounded-2xl overflow-hidden"><img src="${escape(safeLink(item.imageUrl))}" alt="${escape(item.altText || "HOMEolka")}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async"><div class="absolute inset-0 bg-brand-wine/0 group-hover:bg-brand-wine/30 transition-all duration-300 flex items-center justify-center">${instagram.outerHTML}</div></a>`,
        )
        .join("")
    : '<p class="font-display text-2xl font-light text-brand-wine/40">Fotky budou brzy</p>';
  document.querySelector('link[rel="canonical"]').href = siteURL;
  document
    .querySelector('meta[property="og:url"]')
    .setAttribute("content", siteURL);
  const business = document.querySelector("#business-data");
  if (business) {
    const data = JSON.parse(business.textContent);
    data.url = siteURL;
    if (settings.contactEmail) data.email = settings.contactEmail;
    data.logo = new URL("./assets/media/logo.svg", siteURL).href;
    data.image = new URL("./assets/media/social-preview.jpg", siteURL).href;
    data.contactPoint.email = settings.contactEmail || data.contactPoint.email;
    data.sameAs = [settings.instagramUrl, settings.facebookUrl].filter(Boolean);
    // The original schema listed fixed hours inconsistent with the public note.
    // Do not promise fixed opening hours that the owner has not confirmed.
    delete data.openingHoursSpecification;
    business.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
  }
  return document;
}
