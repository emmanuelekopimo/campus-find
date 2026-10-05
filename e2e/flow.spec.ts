import path from "node:path";
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

test("visitors land on sign in with the demo account prefilled", async ({ page }) => {
  await page.goto("/mine");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("#email")).toHaveValue("student@uniuyo.edu.ng");
  await expect(page.locator("#password")).toHaveValue("student123");
});

test("search and type filter narrow the feed", async ({ page }) => {
  await signIn(page);
  await page.fill("input[name=q]", "keys");
  await page.locator(".seg label", { hasText: "Found" }).click();
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=keys/);
  const cards = page.getByTestId("item-card");
  await expect(cards.first()).toBeVisible();
  for (const tag of await page.getByTestId("type-tag").allTextContents()) expect(tag.trim().toLowerCase()).toBe("found");
});

test("post form shows inline errors", async ({ page }) => {
  await signIn(page);
  await page.getByTestId("nav-post").click();
  await page.getByTestId("submit-item").click();
  await expect(page.getByText("Choose lost or found")).toBeVisible();
  await expect(page.getByText("Give it a short title, at least 4 characters")).toBeVisible();
  await expect(page.getByText("Where was it lost or found?")).toBeVisible();
});

test("posting a found calculator with a photo suggests the matching lost post", async ({ page }) => {
  await signIn(page);
  await page.goto("/post");
  await page.locator(".type-toggle label", { hasText: "Found something" }).click();
  await page.fill("#title", "Black scientific calculator");
  await page.selectOption("#category", "Electronics");
  await page.fill("#location", "Faculty of Science");
  await page.fill("#description", "Found a black Casio calculator under a seat in Lecture Theatre 2 after the test.");
  await page.getByTestId("photo-input").setInputFiles(path.join(__dirname, "../public/demo/found-calculator.jpg"));
  await expect(page.getByText("Photo selected")).toBeVisible();
  await page.getByTestId("submit-item").click();
  await expect(page).toHaveURL(/\/items\/\d+\?posted=1/);
  await expect(page.getByTestId("posted-notice")).toContainText("possible");
  const first = page.getByTestId("match").first();
  await expect(first).toContainText("Casio fx-991ES calculator");
  await expect(first).toContainText("Same category: Electronics");
  await expect(page.locator(".photo img")).toHaveAttribute("src", /\/api\/images\//);
  const img = await page.request.get((await page.locator(".photo img").getAttribute("src"))!);
  expect(img.headers()["content-type"]).toBe("image/jpeg");
});

test("student claims a found item and the poster accepts and closes it", async ({ browser }) => {
  // Demo student claims the earbuds case found by Idara.
  const a = await browser.newContext();
  const demo = await a.newPage();
  await signIn(demo);
  await demo.goto("/?q=earbuds");
  await demo.getByTestId("item-card").filter({ hasText: "Earbuds charging case" }).click();
  await expect(demo.getByTestId("contact")).toContainText("Email");
  await demo.fill("#message", "Those are my black Oraimo earbuds, the left one has a small scratch.");
  await demo.fill("#contact", "0803 123 4501");
  await demo.getByTestId("send-claim").click();
  await expect(demo.getByTestId("my-claim")).toContainText("Waiting for the poster");
  const itemUrl = demo.url();

  // Idara, the finder, sees the claim, accepts it and marks the item returned.
  const b = await browser.newContext();
  const finder = await b.newPage();
  await signIn(finder, "idara.umoh@student.uniuyo.edu.ng");
  await expect(finder.getByTestId("pending-badge")).toHaveText("1");
  await finder.goto(itemUrl);
  const claim = finder.getByTestId("claim").filter({ hasText: "Ini Ekpo" });
  await expect(claim).toContainText("small scratch");
  await claim.getByTestId("accept-claim").click();
  await expect(claim.locator(".chip-status")).toHaveText("accepted");
  await finder.getByTestId("resolve").click();
  await expect(finder.getByTestId("resolved-notice")).toBeVisible();

  // The demo student's claim now shows as accepted.
  await demo.goto("/claims");
  await expect(demo.getByTestId("my-claim-row").filter({ hasText: "Earbuds charging case" })).toContainText("accepted");
  await a.close();
  await b.close();
});
