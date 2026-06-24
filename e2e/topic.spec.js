'use strict';

const { test, expect } = require('@playwright/test');

test.describe('NodeBB Custom E2E Tests', () => {
	test('should display the local registration form with required account fields', async ({ page }) => {
		const response = await page.goto('/register');

		expect(response.status()).toBeLessThan(400);
		await expect(page.locator('form[component="register/local"]')).toBeVisible();
		await expect(page.locator('#username')).toBeVisible();
		await expect(page.locator('#password')).toBeVisible();
		await expect(page.locator('#password-confirm')).toBeVisible();
		await expect(page.locator('#register')).toBeVisible();
	});

	test('should expose runtime configuration through the public config API', async ({ page }) => {
		const response = await page.goto('/api/config');

		expect(response.status()).toBe(200);

		const config = JSON.parse(await page.locator('body').innerText());
		expect(config).toHaveProperty('csrf_token');
		expect(config).toHaveProperty('relative_path');
		expect(typeof config.csrf_token).toBe('string');
	});
});
