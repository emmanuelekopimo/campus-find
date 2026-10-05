import { expect, type Page } from "@playwright/test";

export async function signIn(page: Page, email?: string) {
  await page.goto("/login");
  if (email) await page.fill("#email", email);
  await page.getByTestId("sign-in").click();
  await expect(page).toHaveURL(/\/$/);
}
