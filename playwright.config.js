'use strict';

const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.BASE_URL || 'http://localhost:4568';

module.exports = defineConfig({
	testDir: './e2e',
	timeout: 30000,
	expect: {
		timeout: 10000,
	},
	fullyParallel: false,
	reporter: [
		['list'],
		['html', { outputFolder: 'playwright-report', open: 'never' }],
	],
	use: {
		baseURL,
		trace: 'on-first-retry',
	},
	webServer: {
		command: 'node loader.js --daemon=false --silent=false',
		url: baseURL,
		reuseExistingServer: true,
		timeout: 120000,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
