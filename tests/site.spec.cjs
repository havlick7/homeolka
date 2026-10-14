const { test, expect } = require("@playwright/test");
const content = require("../content/site.json");

for (const width of [390, 768, 1440]) {
  test(`content, images and layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const failures = [];
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400)
        failures.push(`${response.status()} ${response.url()}`);
    });
    const external = [];
    page.on("request", (request) => {
      if (!request.url().startsWith("http://127.0.0.1:4173"))
        external.push(request.url());
    });
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText(
      "Důvod, proč dnes jít na Homolku",
    );
    await expect(page.locator('[data-content="aboutText"]')).toHaveText(
      content.settings.aboutText,
    );
    await expect(page.locator('[data-content="openingNote"]')).toHaveText(
      content.settings.openingNote,
    );
    await expect(page.locator("#gallery-list img")).toHaveCount(
      content.gallery.length,
    );
    await expect(page.locator("#past-events > div > div")).toHaveCount(
      content.pastEvents.length,
    );
    for (const image of await page.locator("img:not([aria-hidden])").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate((img) => img.complete && img.naturalWidth > 0),
        )
        .toBeTruthy();
    }
    await expect(page.locator("#cookie-banner")).toBeVisible();
    await page.getByRole("button", { name: "Odmítnout", exact: true }).click();
    await page.evaluate(() => scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    expect(failures).toEqual([]);
    expect(external).toEqual([]);
    await page.screenshot({
      path: `artifacts/local-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  });
}

test("mobile navigation supports keyboard and closes after selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.locator("#menu-toggle");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#mobile-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(page.locator("#mobile-menu")).toBeHidden();
  await toggle.click();
  await page
    .locator("#mobile-menu")
    .getByRole("link", { name: "Kontakt", exact: true })
    .click();
  await expect(page).toHaveURL(/#kontakt$/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("analytics requires consent, rejecting persists and settings can reopen", async ({
  page,
}) => {
  const requests = [];
  await page.route("https://www.googletagmanager.com/**", (route) => {
    requests.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "",
    });
  });
  await page.goto("/");
  await expect(page.locator("#cookie-banner")).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "Odmítnout", exact: true }).click();
  await page.reload();
  await page.waitForTimeout(1700);
  await expect(page.locator("#cookie-banner")).toBeHidden();
  expect(requests).toHaveLength(0);
  await page
    .getByRole("button", { name: "Nastavení soukromí", exact: true })
    .click();
  await page.getByRole("button", { name: "Přijmout vše", exact: true }).click();
  await expect.poll(() => requests.length).toBe(1);
  expect(
    await page.evaluate(() => localStorage.getItem("homeolka_cookie_consent")),
  ).toBe("accepted");
  await page
    .getByRole("button", { name: "Nastavení soukromí", exact: true })
    .click();
  await page.getByRole("button", { name: "Odmítnout", exact: true }).click();
  await page.reload();
  await page.waitForTimeout(1700);
  expect(requests).toHaveLength(1);
});

test("map loads only after explicit click", async ({ page }) => {
  const requests = [];
  await page.route("https://www.google.com/maps/embed**", (route) => {
    requests.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Map test</title>",
    });
  });
  await page.goto("/");
  expect(requests).toHaveLength(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.locator("#load-map").click();
  await expect.poll(() => requests.length).toBe(1);
  await expect(page.locator("iframe")).toHaveAttribute(
    "title",
    "HOMEolka – mapa",
  );
});

test("content remains available without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173");
  await expect(page.locator('[data-content="aboutText"]')).toHaveText(
    content.settings.aboutText,
  );
  await expect(page.locator("#gallery-list img")).toHaveCount(
    content.gallery.length,
  );
  await expect(page.locator("#cookie-banner")).toBeHidden();
  await context.close();
});

test("blocked localStorage does not prevent controls from working", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage disabled");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage disabled");
    };
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#cookie-banner")).toBeVisible();
  await page.locator("#reject-cookies").click();
  await expect(page.locator("#cookie-banner")).toBeHidden();
  expect(errors).toEqual([]);
});
