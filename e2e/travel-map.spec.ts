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
  await expect(austin).toHaveAccessibleName(
    "Austin, TX, past home and travel hub.",
  );

  expect(
    await map.locator('button[data-current-home="true"]').count(),
  ).toBeLessThanOrEqual(1);
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

  const residences = map.locator(
    'button[data-place-id]:is([data-relationship="lived"], [data-relationship="current_home"])',
  );
  await expect(residences).toHaveCount(4);
  for (const residence of await residences.all()) {
    await expect(residence).toBeVisible();
  }
  const chapters = await residences.evaluateAll((buttons) =>
    buttons
      .map((button) => {
        const badge = [...button.querySelectorAll('span[aria-hidden="true"]')]
          .map((span) => span.textContent?.trim() ?? "")
          .find((text) => /^[1-4]$/.test(text));
        return {
          badge: Number(badge),
          label: button.getAttribute("aria-label"),
        };
      })
      .sort((left, right) => left.badge - right.badge),
  );
  expect(chapters).toEqual([
    { badge: 1, label: "Murphy, TX, past home." },
    { badge: 2, label: "Richardson, TX, past home." },
    { badge: 3, label: "Austin, TX, past home and travel hub." },
    { badge: 4, label: "New York City, NY, current home." },
  ]);

  await page.locator('button[data-filter="all"]').click();
  await expect(map.locator("[data-life-path]")).toHaveCount(0);
  await expect(map).toHaveAttribute("data-camera", originalCamera ?? "", {
    timeout: 2_500,
  });
  await waitForSettled(map);

  const restoredCamera = await map.getAttribute("data-camera");
  await page.locator('button[data-filter="visited"]').click();
  await expect(page.locator('button[data-filter="visited"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(map).toHaveAttribute("data-camera", restoredCamera ?? "");
  await expect(map.locator("[data-life-path]")).toHaveCount(0);
  await expect(
    map.getByRole("button", {
      name: /Dallas travel hub, 15 places, including 2 home chapters/,
    }),
  ).toHaveCount(1);
  await expect(
    map.locator('button[data-hub-id="austin"][data-relationship="lived"]'),
  ).toHaveCount(1);
  await expect(map.locator('button[data-current-home="true"]')).toHaveCount(1);

  await page.locator('button[data-filter="lived"]').click();
  await expect(map.locator("[data-life-path]")).toHaveCount(1);
  await waitForSettled(map);
  await expect(residences).toHaveCount(4);
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

  const centerBeforeControls = await readCamera(map);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect
    .poll(async () => (await readCamera(map)).scale, { timeout: 1_000 })
    .toBeGreaterThan(centerBeforeControls.scale);
  await waitForSettled(map);
  const afterPlus = await readCamera(map);
  expect(Math.hypot(
    afterPlus.x - centerBeforeControls.x,
    afterPlus.y - centerBeforeControls.y,
  )).toBeLessThan(0.05);

  await page.getByRole("button", { name: "Zoom out" }).click();
  await expect
    .poll(async () => (await readCamera(map)).scale, { timeout: 1_000 })
    .toBeLessThan(afterPlus.scale);
  await waitForSettled(map);
  const afterMinus = await readCamera(map);
  expect(Math.hypot(
    afterMinus.x - afterPlus.x,
    afterMinus.y - afterPlus.y,
  )).toBeLessThan(0.05);
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
  await expect(card.getByText("CHAPTER 04 // CURRENT HOME")).toBeVisible();

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
  await expect(card.getByText("CHAPTER 03 // PAST HOME")).toBeVisible();
  await expect(card.getByText(/^VISIT YEARS \/\/ \d{4}/)).toBeVisible();
  await expect(card.locator("img")).toHaveCount(0);
  await expect(card.getByText("STILLS // COMING SOON")).toBeVisible();

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
  await expect(page.locator('[data-stat="places"] dd')).toHaveText("111");
  await expect(page.locator('[data-stat="countries"] dd')).toHaveText("11");
  await expect(
    page.getByRole("list", { name: "Map marker legend" }),
  ).toBeVisible();

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
  await expect(page.locator('[data-stat="places"] dd')).toHaveText("89");
  await expect(page.locator('[data-stat="major-hubs"] dd')).toHaveText("3");

  await page.locator('button[data-filter="lived"]').press("Enter");
  await expect(page.locator('button[data-filter="lived"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("LIFE PATH");
  await expect(page.locator('[data-stat="chapters"] dd')).toHaveText("4");
  await expect(map.locator("[data-life-path]")).toHaveCount(1);
});

test("loads without unexpected console or page errors", async ({ page }) => {
  const map = await openReadyMap(page);
  await expect(map).toHaveAttribute("data-band", "world");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("WORLD MAP");
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
