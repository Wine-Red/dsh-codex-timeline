import assert from "node:assert/strict";

// Run against an isolated profile with a real, persisted multi-turn session.
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE_URL || "playwright"
);
assert.ok(process.env.DSH_TEST_URL);
assert.ok(process.env.DSH_TEST_SESSION_TITLE);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    locale: "zh-CN",
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.DSH_TEST_URL);
  await page.waitForTimeout(2500);
  for (const name of ["继续", "稍后配置"]) {
    const button = page.getByRole("button", { name, exact: true });
    if (await button.isVisible()) await button.click();
  }
  await page
    .getByText(process.env.DSH_TEST_SESSION_TITLE, { exact: true })
    .click();
  const rail = page.locator(".dsh-navx-rail");
  await rail.waitFor({ state: "visible" });
  await page.waitForTimeout(500);
  const marks = rail.locator("button");
  assert.ok((await marks.count()) >= 5);
  const geometry = await rail.evaluate((nav) => {
    const marks = [...nav.querySelectorAll("button")];
    return {
      left: nav.getBoundingClientRect().left,
      pitch:
        marks[1].getBoundingClientRect().top -
        marks[0].getBoundingClientRect().top,
      widths: marks
        .slice(0, 2)
        .map((mark) => getComputedStyle(mark, "::before").width),
      original: getComputedStyle(
        document.querySelector("nav[data-dsh-navx-replaced]"),
      ).visibility,
    };
  });
  assert.equal(geometry.pitch, 10);
  assert.deepEqual(geometry.widths, ["8px", "8px"]);
  assert.equal(geometry.original, "hidden");
  await marks.nth(2).hover();
  await page.locator(".dsh-navx-preview").waitFor({ state: "visible" });
  await page.waitForTimeout(300);
  assert.equal(
    await marks
      .nth(2)
      .evaluate((mark) => getComputedStyle(mark, "::before").width),
    "30px",
  );
  assert.match(await page.locator(".dsh-navx-preview").innerText(), /第 3 轮/);
  if (process.env.DSH_TEST_SCREENSHOT)
    await page.screenshot({ path: process.env.DSH_TEST_SCREENSHOT });
  await marks.first().click();
  await page.locator('[data-chat-turn="1"]').first().waitFor();
  await page
    .getByRole("button", { name: "时间线只显示收藏轮次", exact: true })
    .click();
  await page.waitForTimeout(400);
  assert.equal(await rail.locator("button:visible").count(), 1);
  await page
    .getByRole("button", { name: "时间线显示全部轮次", exact: true })
    .click();
  assert.ok((await rail.locator("button:visible").count()) >= 5);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "内置插件", exact: true })
    .click();
  await page.getByRole("tab", { name: "Timeline", exact: true }).click();
  await page.locator(".dsh-navx-settingsHeader").click();
  const spacing = page.locator('input[name="markerSpacing"]');
  await spacing.focus();
  await spacing.press("ArrowRight");
  await page.waitForTimeout(500);
  assert.equal(
    await rail.evaluate((nav) => {
      const marks = nav.querySelectorAll("button");
      return (
        marks[1].getBoundingClientRect().top -
        marks[0].getBoundingClientRect().top
      );
    }),
    11,
  );
  await spacing.press("ArrowLeft");
  await page.waitForTimeout(300);
  const right = page.getByRole("switch").nth(1);
  await right.click();
  await page.waitForTimeout(400);
  assert.equal(await rail.getAttribute("data-dsh-navigation-side"), "right");
  assert.ok((await rail.boundingBox()).x > 1200);
  await right.click();
  const enabled = page.getByRole("switch").first();
  await enabled.click();
  await page.waitForTimeout(400);
  assert.equal(await rail.count(), 0);
  assert.equal(await page.locator("[data-dsh-navx-replaced]").count(), 0);
  await enabled.click();
  await rail.waitFor();
  assert.equal(await rail.count(), 1);
  assert.equal(await rail.getAttribute("data-dsh-navigation-side"), "left");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: rc7 rail appearance, left placement, hover gradient and preview, cold-turn jump, favorite filtering; no page errors.",
  );
} finally {
  await browser.close();
}
