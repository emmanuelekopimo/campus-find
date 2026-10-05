import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("mobile: bottom tabs work, item pages fit the screen and owners can review claims", async ({ page }) => {
  await signIn(page);
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await page.locator(".mtabs a", { hasText: "My posts" }).click();
  await expect(page.getByRole("heading", { name: "My posts" })).toBeVisible();
  await page.getByTestId("my-item").filter({ hasText: "Brown leather wallet" }).click();
  await expect(page.getByTestId("item-title")).toHaveText("Brown leather wallet with ATM card");
  await expect(page.getByTestId("claim")).toHaveCount(2);
  await expect(page.getByTestId("match").first()).toContainText("Brown wallet, Access Bank card inside");
  expect(await overflow()).toBeLessThanOrEqual(0);
});
