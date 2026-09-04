import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3001";
const outputDirectory = resolve(
  process.env.TRAVEL_QA_OUTPUT_DIR ?? "test-results/travel-visual",
);

type CaptureOptions = {
  name: string;
  viewport?: { width: number; height: number };
  theme?: "dark" | "light";
  reducedMotion?: "no-preference" | "reduce";
  path?: string;
  prepare?: (page: Page) => Promise<void>;
};

async function waitForMap(page: Page) {
  const map = page.getByRole("region", {
    name: "Pixel world map of places I have visited and lived",
  });
  await map.waitFor();
  await page.locator("[data-place-id]").first().waitFor();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label^="Pixel world map"]')
        ?.getAttribute("data-busy") === "0",
  );
  return map;
}

async function createContext(
  browser: Browser,
  options: CaptureOptions,
): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 1440, height: 1000 },
    reducedMotion: options.reducedMotion ?? "no-preference",
    colorScheme: options.theme === "light" ? "light" : "dark",
  });
  await context.addInitScript(
    ({ theme }) => {
      sessionStorage.setItem("boot-complete", "1");
      localStorage.setItem("theme", theme);
    },
    { theme: options.theme ?? "dark" },
  );
  return context;
}

async function capture(browser: Browser, options: CaptureOptions) {
  const context = await createContext(browser, options);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(`${baseURL}${options.path ?? "/travel"}`);
  await waitForMap(page);
  if (options.prepare) {
    await options.prepare(page);
    await waitForMap(page);
  }
  await page.waitForTimeout(220);
  await page.screenshot({
    path: resolve(outputDirectory, `${options.name}.png`),
  });
  await context.close();

  if (errors.length > 0) {
    throw new Error(`${options.name} emitted errors:\n${errors.join("\n")}`);
  }
}

async function clickFilter(page: Page, mode: "all" | "lived") {
  await page.locator(`[data-filter="${mode}"]`).click();
}

async function clickWorld(page: Page, code: string) {
  await page.locator(`[data-world="${code}"]`).evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
}

async function clickHub(page: Page, id: string) {
  await page
    .locator(`[data-hub-id="${id}"][aria-label*="travel hub"]`)
    .first()
    .click();
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = { width: 1440, height: 1000 };
    const mobile = { width: 390, height: 844 };
    await capture(browser, { name: "desktop-world-all", viewport: desktop });
    await capture(browser, {
      name: "desktop-world-lived",
      viewport: desktop,
      prepare: (page) => clickFilter(page, "lived"),
    });
    await capture(browser, {
      name: "desktop-japan",
      viewport: desktop,
      prepare: (page) => clickWorld(page, "JP"),
    });
    await capture(browser, {
      name: "desktop-usa",
      viewport: desktop,
      prepare: (page) => clickWorld(page, "US"),
    });
    await capture(browser, {
      name: "desktop-dfw",
      viewport: desktop,
      prepare: (page) => clickHub(page, "dfw"),
    });
    await capture(browser, {
      name: "desktop-lived-card",
      viewport: desktop,
      path: "/travel?city=Murphy",
    });
    await capture(browser, {
      name: "desktop-travel-card",
      viewport: desktop,
      path: "/travel?city=Paris",
    });
    await capture(browser, { name: "mobile-world", viewport: mobile });
    await capture(browser, {
      name: "mobile-lived",
      viewport: mobile,
      prepare: (page) => clickFilter(page, "lived"),
    });
    await capture(browser, {
      name: "mobile-dfw",
      viewport: mobile,
      prepare: async (page) => {
        await clickWorld(page, "US");
        await waitForMap(page);
        await clickHub(page, "dfw");
      },
    });
    await capture(browser, {
      name: "mobile-card",
      viewport: mobile,
      path: "/travel?city=Murphy",
    });
    await capture(browser, {
      name: "desktop-reduced-motion",
      viewport: desktop,
      reducedMotion: "reduce",
    });
    await capture(browser, {
      name: "desktop-light-theme",
      viewport: desktop,
      theme: "light",
    });
  } finally {
    await browser.close();
  }
}

void main();
