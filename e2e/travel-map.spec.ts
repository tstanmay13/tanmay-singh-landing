import {
  expect,
  test as base,
  type Locator,
  type Page,
} from "@playwright/test";

type Camera = {
  x: number;
  y: number;
  scale: number;
};

const test = base.extend<{ appErrors: string[] }>({
  appErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      const isExternalBrowserNoise = (message: string) =>
        /net::ERR_BLOCKED_BY_CLIENT/.test(message);

      page.on("pageerror", (error) => {
        errors.push(`[pageerror] ${error.stack ?? error.message}`);
      });
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const text = message.text();
        if (isExternalBrowserNoise(text)) return;
        const source = message.location().url
          ? ` (${message.location().url}:${message.location().lineNumber})`
          : "";
        errors.push(`[console.error] ${text}${source}`);
      });
      await page.addInitScript(() => {
        sessionStorage.setItem("boot-complete", "1");
      });

      await use(errors);
      expect(
        errors,
        "The travel map emitted unexpected browser errors",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

async function waitForSettled(map: Locator, timeout = 2_500) {
  await expect(map).toHaveAttribute("data-busy", "0", { timeout });
}

async function openReadyMap(page: Page) {
  await page.goto("/travel");
  const map = page.getByRole("region", {
    name: "Pixel world map of places I have visited and lived",
  });
  await expect(map).toBeVisible();
  await expect(map.locator("[data-place-id]").first()).toBeAttached();
  await expect(map).toHaveAttribute("data-camera", /.+/);
  await waitForSettled(map);
  return map;
}

async function readAnchor(map: Locator): Promise<{ x: number; y: number }> {
  const raw = await map.getAttribute("data-anchor");
  if (!raw) throw new Error("Travel map did not publish data-anchor.");
  const [x, y] = raw.split(",").map(Number);
  if (![x, y].every(Number.isFinite)) {
    throw new Error(`Invalid travel map anchor: ${raw}`);
  }
  return { x, y };
}

async function readCamera(map: Locator): Promise<Camera> {
  const raw = await map.getAttribute("data-camera");
  if (!raw) throw new Error("Travel map did not publish data-camera.");
  const [x, y, scale] = raw.split(",").map(Number);
  if (![x, y, scale].every(Number.isFinite)) {
    throw new Error(`Invalid travel map camera: ${raw}`);
  }
  return { x, y, scale };
}

async function requiredBox(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Expected locator to have a bounding box.");
  return box;
}

test("hover is inert, drag suppresses activation, and click selects", async ({
  page,
}) => {
  const map = await openReadyMap(page);
  const heading = page.getByRole("heading", { level: 1 });
  const pin = map.locator('button[data-current-home="true"]');
  await expect(pin).toBeVisible();

  const originalHeading = await heading.textContent();
  await pin.hover();
  await expect(heading).toHaveText(originalHeading ?? "");

  const pinBox = await requiredBox(pin);
  const start = {
    x: pinBox.x + pinBox.width / 2,
    y: pinBox.y + pinBox.height / 2,
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 10, start.y + 2, { steps: 2 });
  await expect(map).toHaveAttribute("data-interaction", "dragging");
  await page.mouse.up();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(pin).toHaveAttribute("aria-pressed", "false");
  await waitForSettled(map);

  await pin.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(pin).toHaveAttribute("aria-pressed", "true");
});

test("DFW hub expands canonical homes without duplicate markers", async ({
  page,
}) => {
  const map = await openReadyMap(page);
  await map.locator('button[data-entity-id="hub:dfw"]').click();
  await expect(map).toHaveAttribute("data-band", "city", { timeout: 2_500 });
  await waitForSettled(map);

  const murphy = map.getByRole("button", {
    name: "Murphy, TX, past home.",
  });
  const richardson = map.getByRole("button", {
    name: "Richardson, TX, past home.",
  });
  await expect(murphy).toBeVisible();
  await expect(richardson).toBeVisible();
  await expect(murphy).toHaveCount(1);
  await expect(richardson).toHaveCount(1);

  const austin = map.locator(
    'button[data-place-id][data-hub-id="austin"][data-relationship="lived"]',
  );
  await expect(austin).toHaveCount(1);
  await expect(map.locator('button[data-current-home="true"]')).not.toBeInViewport();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    map.locator('button[aria-pressed="true"][data-relationship="lived"]'),
  ).toHaveCount(0);

  await page.locator('button[data-filter="lived"]').click();
  await expect(map.locator("[data-life-path]")).toHaveCount(1);
  await waitForSettled(map);
  const currentHome = map.locator('button[data-current-home="true"]');
  await expect(currentHome).toHaveCount(1);
  await expect(currentHome).toHaveAccessibleName(
    "New York City, NY, current home.",
  );
});

test("filters preserve camera and canonical residence chapters", async ({
  page,
}) => {
  const map = await openReadyMap(page);
  const originalCamera = await map.getAttribute("data-camera");

  await page.locator('button[data-filter="lived"]').click();
  await expect(map.locator("[data-life-path]")).toHaveCount(1);
  await waitForSettled(map);

  await expect(
    map.locator('[data-entity-id="cluster:dfw-lived"]'),
  ).toHaveCount(1);
  await expect(
    map.getByRole("button", { name: "Murphy, TX, past home." }),
  ).toHaveCount(0);
  await expect(
    map.locator('button[data-hub-id="austin"][data-relationship="lived"]'),
  ).toHaveCount(1);
  await expect(map.locator('button[data-current-home="true"]')).toHaveCount(1);

  await page.locator('button[data-filter="all"]').click();
  await expect(map.locator("[data-life-path]")).toHaveCount(0);
  await expect(map).toHaveAttribute("data-camera", originalCamera ?? "", {
    timeout: 2_500,
  });
  await waitForSettled(map);
  await expect(
    map.getByRole("button", {
      name: /Dallas travel hub, 15 places, including 2 home chapters/,
    }),
  ).toHaveCount(1);
});

test("wheel anchors its pointer and zoom controls anchor the center", async ({
  page,
}) => {
  const map = await openReadyMap(page);
  const mapBox = await requiredBox(map);
  const pointer = {
    x: mapBox.width * 0.62,
    y: mapBox.height * 0.58,
  };
  const before = await readCamera(map);
  const anchorBefore = {
    x: before.x + (pointer.x - mapBox.width / 2) / before.scale,
    y: before.y + (pointer.y - mapBox.height / 2) / before.scale,
  };

  await page.mouse.move(mapBox.x + pointer.x, mapBox.y + pointer.y);
  await page.mouse.wheel(0, -240);
  await expect
    .poll(async () => (await readCamera(map)).scale, { timeout: 1_000 })
    .toBeGreaterThan(before.scale);
  await waitForSettled(map);
  const after = await readCamera(map);
  const anchorAfter = {
    x: after.x + (pointer.x - mapBox.width / 2) / after.scale,
    y: after.y + (pointer.y - mapBox.height / 2) / after.scale,
  };
  expect(Math.hypot(
    anchorAfter.x - anchorBefore.x,
    anchorAfter.y - anchorBefore.y,
  )).toBeLessThan(0.15);

  const beforePlus = await readCamera(map);
  const centerBeforeControls = await readAnchor(map);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect
    .poll(async () => (await readCamera(map)).scale, { timeout: 1_000 })
    .toBeGreaterThan(beforePlus.scale);
  await waitForSettled(map);
  const afterPlusAnchor = await readAnchor(map);
  expect(
    Math.hypot(
      afterPlusAnchor.x - centerBeforeControls.x,
      afterPlusAnchor.y - centerBeforeControls.y,
    ),
  ).toBeLessThan(0.8);

  const beforeMinus = await readCamera(map);
  await page.getByRole("button", { name: "Zoom out" }).click();
  await expect
    .poll(async () => (await readCamera(map)).scale, { timeout: 1_000 })
    .toBeLessThan(beforeMinus.scale);
  await waitForSettled(map);
  const afterMinusAnchor = await readAnchor(map);
  expect(
    Math.hypot(
      afterMinusAnchor.x - afterPlusAnchor.x,
      afterMinusAnchor.y - afterPlusAnchor.y,
    ),
  ).toBeLessThan(0.8);
});

test("drag interrupts a country flight and settles promptly", async ({
  page,
}) => {
  const map = await openReadyMap(page);
  await page.locator('button[data-world="JP"]').click();
  await expect(map).toHaveAttribute("data-interaction", "camera-animating", {
    timeout: 500,
  });

  const box = await requiredBox(map);
  const point = {
    x: box.x + box.width * 0.5,
    y: box.y + box.height * 0.62,
  };
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 14, point.y + 3, { steps: 2 });
  await expect(map).toHaveAttribute("data-interaction", "dragging");
  await page.mouse.up();

  const releasedAt = Date.now();
  await waitForSettled(map, 2_500);
  await expect(map).toHaveAttribute(
    "data-interaction",
    /^(idle|hovering|selected)$/,
  );
  expect(Date.now() - releasedAt).toBeLessThan(2_500);
});

test("card owns its pixels and Escape restores pin focus", async ({ page }) => {
  const map = await openReadyMap(page);
  const pin = map.locator('button[data-current-home="true"]');
  const placeId = await pin.getAttribute("data-place-id");
  await pin.click();
  const card = page.getByRole("dialog");
  await expect(card).toBeVisible();
  await waitForSettled(map);

  const cardBox = await requiredBox(card);
  const cardOwnsPoint = await page.evaluate(
    ({ x, y }) =>
      Boolean(
        document
          .elementFromPoint(x, y)
          ?.closest('[data-layer="card"]'),
      ),
    {
      x: cardBox.x + cardBox.width / 2,
      y: cardBox.y + cardBox.height / 2,
    },
  );
  expect(cardOwnsPoint).toBe(true);
  await expect(card).toHaveAttribute("data-relationship", "current_home");
  await expect(card.locator('[aria-label="Classification"]')).toHaveText(
    "CURRENT HOME",
  );
  await expect(card.getByText("CHAPTER 07 // CURRENT HOME")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => (document.activeElement as HTMLElement | null)?.dataset.placeId,
      ),
    )
    .toBe(placeId);
});

test("Austin and visited cards expose correct facts without images", async ({
  page,
}) => {
  const map = await openReadyMap(page);
  await map.locator('button[data-entity-id="hub:austin"]').click();
  await expect(map).toHaveAttribute("data-band", "city", { timeout: 2_500 });
  await waitForSettled(map);

  const austin = map.locator(
    'button[data-hub-id="austin"][data-relationship="lived"]',
  );
  await expect(austin).toHaveCount(1);
  await austin.click();
  let card = page.getByRole("dialog");
  await expect(card).toBeVisible();
  await waitForSettled(map);
  await expect(card.locator('[aria-label="Classification"]')).toContainText(
    "LIVED HERE",
  );
  await expect(card.locator('[aria-label="Classification"]')).toContainText(
    "TRAVEL HUB",
  );
  await expect(card.getByText("CHAPTER 06 // PAST HOME")).toBeVisible();
  await expect(card.getByText(/^VISIT YEARS \/\/ \d{4}/)).toBeVisible();
  await expect(card.locator("img")).toHaveCount(0);
  await expect(card.getByText("PHOTOS COMING LATER")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);
  const visited = map
    .locator(
      'button[data-hub-id="austin"][data-relationship="visited"]',
    )
    .first();
  await expect(visited).toBeVisible();
  await visited.click();
  card = page.getByRole("dialog");
  await expect(card).toBeVisible();
  await waitForSettled(map);
  await expect(card.locator('[aria-label="Classification"]')).toHaveText(
    "VISITED",
  );
  await expect(card.locator("img")).toHaveCount(0);
});

test.describe("reduced motion", () => {
  test("omits ambient motion, ripples, and long camera flights", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    const map = await openReadyMap(page);
    const terrain = map.locator('[data-layer="terrain"]');
    await expect
      .poll(() =>
        terrain.evaluate(
          (element) =>
            [...element.children].filter((child) => child.tagName === "DIV")
              .length,
        ),
      )
      .toBe(0);

    const box = await requiredBox(map);
    await page.mouse.move(
      box.x + box.width * 0.4,
      box.y + box.height * 0.55,
    );
    await page.mouse.move(
      box.x + box.width * 0.6,
      box.y + box.height * 0.6,
      { steps: 4 },
    );
    await expect(map).toHaveAttribute("data-ripples", "0");

    const before = await map.getAttribute("data-camera");
    await page.locator('button[data-world="JP"]').click();
    await expect
      .poll(async () => (await map.getAttribute("data-camera")) !== before, {
        timeout: 500,
      })
      .toBe(true);
    await expect(map).toHaveAttribute("data-busy", "0");
    await expect(map).not.toHaveAttribute(
      "data-interaction",
      "camera-animating",
    );
  });
});

test("contextual stats and keyboard controls stay scoped to the view", async ({
  page,
}) => {
  const map = await openReadyMap(page);
  await expect(page.locator('[data-stat="places"] dd')).toHaveText("125");
  await expect(page.locator('[data-stat="countries"] dd')).toHaveText("12");
  await expect(page.getByRole("group", { name: "Map story mode" })).toBeVisible();

  const beforeZoom = await readCamera(map);
  await map.focus();
  await page.keyboard.press("+");
  await expect
    .poll(async () => (await readCamera(map)).scale, { timeout: 1_000 })
    .toBeGreaterThan(beforeZoom.scale);
  await waitForSettled(map);

  await page.locator('button[data-world="US"]').press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("USA", {
    timeout: 2_500,
  });
  await waitForSettled(map);
  await expect(page.locator('[data-stat="places"] dd')).toHaveText("94");
  await expect(page.locator('[data-stat="major-hubs"] dd')).toHaveText("3");
  const hud = page.locator("header");
  const usaHub = map.locator('button[data-entity-id="hub:dfw"]');
  const hudBox = await requiredBox(hud);
  const hubBox = await requiredBox(usaHub);
  expect(hubBox.y + hubBox.height / 2).toBeGreaterThan(hudBox.y + hudBox.height);

  await page.locator('button[data-filter="lived"]').press("Enter");
  await expect(page.locator('button[data-filter="lived"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("LIFE PATH");
  await expect(page.locator('[data-stat="chapters"] dd')).toHaveText("7");
  await expect(map.locator("[data-life-path]")).toHaveCount(1);
  await expect(
    page.locator('button[data-world="MX"][aria-current="true"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('button[data-world="US"][aria-current="true"]'),
  ).toHaveCount(1);
});

test("loads without unexpected console or page errors", async ({ page }) => {
  const map = await openReadyMap(page);
  await expect(map).toHaveAttribute("data-band", "world");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("WORLD MAP");
  await expect(map.locator("[class*='countryFrame']")).toHaveCount(0);
});

test("Japan focus fits the islands and hides Hanoi", async ({ page }) => {
  const map = await openReadyMap(page);
  const before = await readCamera(map);
  await page.locator('button[data-world="JP"]').click();
  await expect(map).toHaveAttribute("data-busy", "1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("WORLD MAP");
  await expect
    .poll(async () => (await readCamera(map)).scale, { timeout: 1_200 })
    .toBeGreaterThan(before.scale);
  await waitForSettled(map, 1_200);
  const after = await readCamera(map);
  expect(after.scale).toBeGreaterThanOrEqual(3.2);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("JAPAN");
  await expect(page.locator("[data-kicker]")).toHaveText("COUNTRY");
  await expect(page.locator('[data-stat="major-hubs"] dd')).not.toHaveText("0");
  await expect(map.locator("[data-regional-terrain='1']")).toHaveCount(1);
  await expect(map.getByText("HANOI")).toHaveCount(0);
  await expect(
    page.locator('button[data-world="VN"][aria-current="true"]'),
  ).toHaveCount(0);
});

test("button zoom stays near 1.18x and LIFE PATH clusters DFW homes", async ({
  page,
}) => {
  const map = await openReadyMap(page);
  const before = await readCamera(map);
  const beforeAnchor = await readAnchor(map);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await waitForSettled(map);
  const after = await readCamera(map);
  const afterAnchor = await readAnchor(map);
  expect(after.scale / before.scale).toBeGreaterThan(1.14);
  expect(after.scale / before.scale).toBeLessThan(1.21);
  expect(
    Math.hypot(afterAnchor.x - beforeAnchor.x, afterAnchor.y - beforeAnchor.y),
  ).toBeLessThan(0.8);

  await page.locator('button[data-filter="lived"]').click();
  await waitForSettled(map);
  await expect(map.locator("[data-life-path]")).toHaveCount(1);
  const cluster = map.locator('[data-entity-id="cluster:dfw-lived"]');
  await expect(cluster).toBeVisible();
  await expect(cluster).toHaveAccessibleName(/04–05 DFW/);

  await cluster.click();
  await waitForSettled(map);
  await expect(
    map.getByRole("button", { name: "Murphy, TX, past home." }),
  ).toBeVisible();
  await expect(map.getByText("05 MURPHY")).toBeVisible();
  await expect(
    map.getByRole("button", { name: "Richardson, TX, past home." }),
  ).toBeVisible();
  await expect(map.getByText("04 RICHARDSON")).toBeVisible();
});

test("two-finger Chromium pinch zooms without opening a card", async ({
  context,
  page,
}) => {
  const map = await openReadyMap(page);
  const before = await readCamera(map);
  const box = await requiredBox(map);
  const center = {
    x: box.x + box.width / 2,
    y: box.y + box.height * 0.58,
  };
  const client = await context.newCDPSession(page);
  await client.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 2,
  });
  const touch = (x: number, id: number) => ({
    x,
    y: center.y,
    id,
    radiusX: 2,
    radiusY: 2,
    force: 1,
  });

  try {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [touch(center.x - 60, 1), touch(center.x + 60, 2)],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [touch(center.x - 100, 1), touch(center.x + 100, 2)],
    });
    await expect(map).toHaveAttribute("data-interaction", "zooming");
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await client.detach();
  }

  await waitForSettled(map);
  const after = await readCamera(map);
  expect(Math.abs(after.scale - before.scale)).toBeGreaterThan(0.2);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("terrain remains identical and covers the world after panning", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const map = await openReadyMap(page);
  const terrain = map.locator('canvas[data-regional-terrain="1"]');
  await expect(terrain).toHaveCount(1);
  const before = await terrain.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  const cameraBefore = await map.getAttribute("data-camera");
  const box = await requiredBox(map);
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.65);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.65, { steps: 8 });
  await page.mouse.up();
  await waitForSettled(map);
  expect(await map.getAttribute("data-camera")).not.toBe(cameraBefore);
  expect(await terrain.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).toBe(before);
  const coverage = await terrain.evaluate((canvas) => ({
    width: parseFloat(getComputedStyle(canvas).width),
    height: parseFloat(getComputedStyle(canvas).height),
  }));
  expect(coverage).toEqual({ width: 2560, height: 1280 });
});

test("country navigation keeps other destinations available during exploration", async ({ page }) => {
  const map = await openReadyMap(page);
  await page.locator('button[data-world="VN"]').click();
  await waitForSettled(map);
  // Offscreen markers stay mounted so panning brings them in immediately,
  // including destinations outside the country used to navigate here.
  const home = map.locator('button[data-current-home="true"]');
  await expect(home).toHaveCount(1);
  const point = await home.evaluate((node) => ({ x: parseFloat(node.style.left), y: parseFloat(node.style.top) }));
  const camera = await readCamera(map);
  const box = await requiredBox(map);
  const start = { x: box.x + box.width / 2, y: box.y + box.height * 0.6 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 10, start.y, { steps: 2 });
  await page.mouse.move(start.x + (camera.x - point.x) * camera.scale, start.y + (camera.y - point.y) * camera.scale, { steps: 12 });
  await expect(home).toBeInViewport();
  await page.mouse.up();
  await waitForSettled(map);
  await expect(page.locator('button[data-world="US"]')).toHaveAttribute("aria-current", "true");
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`continuous pan keeps labels and terrain stable at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const map = await openReadyMap(page);
    const terrain = map.locator('canvas[data-regional-terrain="1"]');
    await expect(terrain).toHaveCount(1);
    const cameraBefore = await readCamera(map);
    await page.evaluate(() => {
      const samples: number[] = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) samples.push(entry.duration);
      });
      observer.observe({ type: "longtask", buffered: false });
      Object.assign(window, { travelPerf: { samples, observer } });
    });
    const box = await requiredBox(map);
    await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.55);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.6, { steps: 30 });
    await expect(map).toHaveAttribute("data-interaction", "dragging");
    await expect(map.locator('[data-layer="labels"]')).toHaveCSS("opacity", "1");
    await expect(terrain).toHaveCSS("opacity", "1");
    await page.screenshot({ path: testInfo.outputPath("during-pan.png") });
    await page.mouse.up();
    await waitForSettled(map);
    expect((await readCamera(map)).x).not.toBe(cameraBefore.x);
    const longTasks = await page.evaluate(() => {
      const perf = (window as unknown as { travelPerf: { samples: number[]; observer: PerformanceObserver } }).travelPerf;
      perf.observer.disconnect();
      return perf.samples;
    });
    await testInfo.attach("pan-long-tasks", { body: JSON.stringify(longTasks), contentType: "application/json" });
    console.log(`${viewport.width}px pan long tasks (>50ms): ${JSON.stringify(longTasks)}`);
    // Allow a small scheduling outlier, but catch repeated frame stalls.
    expect(longTasks.reduce((total, duration) => total + duration, 0)).toBeLessThan(200);
    if (viewport.width < 500) {
      const clipped = await page.locator("header dl dt, header dl dd").evaluateAll((nodes) => nodes.filter((node) => node.scrollWidth > node.clientWidth).map((node) => node.textContent));
      expect(clipped).toEqual([]);
    }
    await page.screenshot({ path: testInfo.outputPath("settled-map.png") });
  });
}

test("map life stays decorative, clear of pins, and pauses with navigation", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const map = await openReadyMap(page);
  const life = map.locator('[data-ocean-life]');
  await expect(life.locator('[data-ocean-kind="sailboat"]').first()).toBeAttached();
  await expect(life.locator('[data-ocean-kind="trees"]').first()).toBeAttached();
  await expect(life.locator('[data-ocean-kind="camp"]').first()).toBeAttached();
  expect(await life.locator('[data-ocean-kind]').count()).toBeLessThanOrEqual(94);
  await expect(life).toHaveAttribute("aria-hidden", "true");
  const overlap = await map.evaluate((root) => {
    const pins = [...root.querySelectorAll('[data-place-id]')].map((node) => node.getBoundingClientRect());
    return [...root.querySelectorAll('[data-ocean-kind]')].some((node) => {
      const rect = node.getBoundingClientRect();
      return getComputedStyle(node).pointerEvents !== "none" || pins.some((pin) => rect.left < pin.right && rect.right > pin.left && rect.top < pin.bottom && rect.bottom > pin.top);
    });
  });
  expect(overlap).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("living-atlas.png") });
  const box = await requiredBox(map);
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.65);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.65, { steps: 8 });
  const moving = await life.evaluate((root) => [...root.querySelectorAll('*')].filter((node) => getComputedStyle(node).animationName !== "none").map((node) => getComputedStyle(node).animationPlayState));
  expect(moving.length).toBeGreaterThan(0);
  expect(moving.every((state) => state === "paused")).toBe(true);
  await page.mouse.up();
  await waitForSettled(map);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(life).toHaveCount(0);
});

test("destination gallery opens locally and supports keyboard navigation", async ({ page }, testInfo) => {
  const map = await openReadyMap(page);
  await page.getByRole("button", { name: "Focus map on Thailand" }).click();
  await waitForSettled(map);
  await map.getByRole("button", { name: "Ko Phangan, visited place." }).click();
  const card = page.getByRole("dialog", { name: /Ko Phangan travel place details/i });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /Open Ko Phangan gallery/i }).click();
  const gallery = page.getByRole("dialog", { name: "Ko Phangan", exact: true });
  await expect(gallery).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("ko-phangan-gallery.png"), fullPage: true });
  await expect(gallery.getByText("1 / 14", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(gallery.getByText("2 / 14", { exact: true })).toBeVisible();
  await expect(gallery.locator("img").first()).toHaveAttribute("src", /tanmay-relaxing/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("End");
  await expect(gallery.getByText("14 / 14", { exact: true })).toBeVisible();
  await expect(gallery.locator("figure img")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("ko-phangan-mobile-gallery.png") });
  await expect.poll(async () => gallery.locator('[aria-current="true"]').evaluate((button) => {
    const item = button.getBoundingClientRect();
    const rail = button.parentElement!.getBoundingClientRect();
    return item.left >= rail.left && item.right <= rail.right;
  })).toBe(true);
  await page.keyboard.press("Home");
  await expect(gallery.getByText("1 / 14", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(gallery).toHaveCount(0);
  await expect(card.getByRole("button", { name: /Open Ko Phangan gallery/i })).toBeFocused();
});

for (const { destination, count, folder } of [
  { destination: "Grand Teton National Park", count: 10, folder: "grand-teton-national-park" },
  { destination: "Yellowstone National Park", count: 11, folder: "yellowstone-national-park" },
  { destination: "Leissigen", count: 1, folder: "leissigen" },
  { destination: "Houston", count: 3, folder: "houston" },
  { destination: "Gun Barrel City", count: 1, folder: "gun-barrel-city" },
  { destination: "Tokyo", count: 10, folder: "tokyo" },
  { destination: "Kyoto", count: 7, folder: "kyoto" },
  { destination: "Chiang Mai", count: 15, folder: "chiang-mai" },
]) {
  test(`${destination} opens its local gallery on desktop and mobile`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/travel?city=${encodeURIComponent(destination)}`);
    const card = page.getByRole("dialog", { name: new RegExp(`${destination} travel place details`, "i") });
    await expect(card).toBeVisible();
    const opener = card.getByRole("button", { name: new RegExp(`Open ${destination} gallery`, "i") });
    await opener.click();
    const gallery = page.getByRole("dialog", { name: destination, exact: true });
    await expect(gallery.getByText(`1 / ${count}`, { exact: true })).toBeVisible();
    const mainImage = gallery.locator("figure img");
    await expect.poll(() => mainImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(mainImage).toHaveAttribute("src", new RegExp(folder));
    await page.screenshot({ path: testInfo.outputPath("expanded-desktop-gallery.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.keyboard.press("End");
    await expect(gallery.getByText(`${count} / ${count}`, { exact: true })).toBeVisible();
    await expect.poll(() => mainImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: testInfo.outputPath("expanded-mobile-gallery.png") });
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
  });
}
