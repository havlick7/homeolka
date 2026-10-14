import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { render } from "./render.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "dist");
const siteURL = new URL(process.env.SITE_URL || "https://www.homeolka.cz/");
if (!siteURL.pathname.endsWith("/")) siteURL.pathname += "/";
const preview = process.env.PREVIEW === "true";
const content = JSON.parse(
  await readFile(resolve(root, "content/site.json"), "utf8"),
);
const document = render(
  await readFile(resolve(root, "index.html"), "utf8"),
  content,
  siteURL.href,
);
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, "assets/media"), { recursive: true });
await cp(resolve(root, "assets/media"), resolve(output, "assets/media"), {
  recursive: true,
});
await cp(resolve(root, "assets/js"), resolve(output, "assets/js"), {
  recursive: true,
});
await cp(resolve(root, "admin"), resolve(output, "admin"), { recursive: true });

// Produce responsive local images. The original files remain available for download.
let originalBytes = 0,
  optimizedBytes = 0;
const images = new Map();
for (const img of document.querySelectorAll("img")) {
  const path = img.getAttribute("src");
  if (!path.startsWith("./assets/media/"))
    throw new Error(`Nonlocal image: ${path}`);
  if (path.endsWith(".svg")) continue;
  const input = resolve(root, path);
  const meta = await sharp(input).metadata();
  img.setAttribute("width", String(meta.width));
  img.setAttribute("height", String(meta.height));
  if (!images.has(path)) {
    const widths = [
      ...new Set([480, 960, 1440].map((width) => Math.min(width, meta.width))),
    ];
    const variants = [];
    for (const width of widths) {
      const target = path.replace(/\.[^.]+$/, `-${width}.webp`);
      const result = await sharp(input)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 88 })
        .toFile(resolve(output, target));
      variants.push({ target, width, bytes: result.size });
    }
    images.set(path, variants);
    originalBytes += (await readFile(input)).length;
    optimizedBytes += variants.at(-1).bytes;
  }
  const variants = images.get(path);
  img.setAttribute("src", variants.at(-1).target);
  img.setAttribute(
    "srcset",
    variants.map(({ target, width }) => `${target} ${width}w`).join(", "),
  );
  img.setAttribute(
    "sizes",
    img.closest("#hero")
      ? "(min-width: 1024px) 540px, (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)"
      : img.closest("#instagram")
        ? "(min-width: 1024px) 320px, 33vw"
        : "(min-width: 1024px) 384px, (min-width: 640px) 50vw, calc(100vw - 32px)",
  );
}
const socialPath = "./assets/media/social-preview.jpg";
await sharp(resolve(root, "assets/media/social-preview.png"))
  .resize({ width: 1200, withoutEnlargement: true })
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(resolve(output, socialPath));
for (const meta of document.querySelectorAll(
  'meta[property="og:image"],meta[name="twitter:image"]',
))
  meta.setAttribute("content", new URL(socialPath, siteURL).href);
if (preview) {
  const meta = document.createElement("meta");
  meta.name = "robots";
  meta.content = "noindex, nofollow";
  document.head.append(meta);
}
await writeFile(resolve(output, "index.html"), document.toString());
await writeFile(
  resolve(output, "robots.txt"),
  preview
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${new URL("sitemap.xml", siteURL)}\n`,
);
await writeFile(
  resolve(output, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteURL.href.replace(/&/g, "&amp;")}</loc></url></urlset>\n`,
);
await writeFile(resolve(output, ".nojekyll"), "");
await writeFile(
  resolve(output, "_headers"),
  "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/admin/*\n  X-Robots-Tag: noindex, nofollow\n",
);
const result = spawnSync(
  process.execPath,
  [
    resolve(root, "node_modules/tailwindcss/lib/cli.js"),
    "-c",
    "./tailwind.config.js",
    "-i",
    "./assets/css/tailwind.css",
    "-o",
    "./dist/assets/css/main.css",
    "--minify",
  ],
  { cwd: root, stdio: "inherit" },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(
  `Built dist/. Raster images (largest variants): ${originalBytes} → ${optimizedBytes} bytes.`,
);
