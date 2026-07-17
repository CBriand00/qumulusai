import { test, expect } from "@playwright/test";

/** Public marketing + navigation flows (no backend required). */

test("landing page shows hero and primary CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /apply for consideration/i }).first()).toBeVisible();
});

test("primary navigation reaches interior pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "About", exact: true }).first().click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/how-it-works");
  await expect(page.getByRole("heading", { name: /private, considered process/i })).toBeVisible();
});

test("FAQ page renders and accordion expands", async ({ page }) => {
  await page.goto("/faq");
  const trigger = page.getByRole("button", { name: /is this a real matchmaking platform/i });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(trigger).toHaveAttribute("data-state", "open");
  await expect(page.getByText(/not a swipe-based dating app/i)).toBeVisible();
});

test("legal pages show the review-required notice", async ({ page }) => {
  await page.goto("/legal/terms");
  await expect(page.getByRole("heading", { name: /terms of use/i })).toBeVisible();
  await expect(page.getByText(/legal review is required before launch/i)).toBeVisible();
});

test("safety page lists privacy commitments", async ({ page }) => {
  await page.goto("/safety");
  await expect(page.getByText(/profiles are not public/i)).toBeVisible();
});

test("unauthenticated /apply redirects to registration", async ({ page }) => {
  await page.goto("/apply");
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: /begin your application/i })).toBeVisible();
});

test("login and register pages render their forms", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  await page.goto("/register");
  await expect(page.getByLabel("Full name")).toBeVisible();
});
