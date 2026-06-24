'use strict';

const { test, expect } = require('@playwright/test');

test.describe('NodeBB Custom E2E Tests', () => {
	test('should render the public forum homepage with navigation to login', async ({ page }) => {
		const response = await page.goto('/');

		expect(response.status()).toBeLessThan(400);
		await expect(page.locator('body')).toBeVisible();
		await expect(page.locator('a[href="/login"]').first()).toBeVisible();
	});

	test('should reject login with invalid credentials and show an error message', async ({ page }) => {
		await page.goto('/login');

		await page.locator('#username').fill('custom-user-does-not-exist');
		await page.locator('#password').fill('DefinitelyWrong123!');
		await page.locator('#login').click();

		await expect(page.locator('#login-error-notify')).toBeVisible();
		await expect(page.locator('#login-error-notify')).toContainText(/failed|invalid|login/i);
	});
});
