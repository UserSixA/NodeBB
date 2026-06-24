'use strict';

const { describe, test, expect, jest: jestGlobals, beforeEach, afterEach } = require('@jest/globals');

jestGlobals.mock('workerpool', () => ({
	pool: jestGlobals.fn(() => ({
		exec: jestGlobals.fn(async (method, args) => {
			const bcrypt = require('bcryptjs');

			if (method === 'hash') {
				return await bcrypt.hash(args[0], args[1]);
			}
			if (method === 'compare') {
				return await bcrypt.compare(args[0], args[1]);
			}
			throw new Error(`Unknown workerpool method: ${method}`);
		}),
	})),
}));

const winston = require('winston');
const password = require('../src/password');
const pagination = require('../src/pagination');
const ratelimit = require('../src/middleware/ratelimit');
const slugify = require('../src/slugify');
const utils = require('../src/utils');

describe('NodeBB Custom Unit Tests with Jest', () => {
	describe('slugify', () => {
		test('should create a URL-safe slug from a topic title', () => {
			expect(slugify('NodeBB Test Topic 2026')).toBe('nodebb-test-topic-2026');
		});

		test('should reject dot-only slugs after normalization', () => {
			expect(slugify('.')).toBe('');
			expect(slugify('..')).toBe('');
			expect(utils.isSlugValid(slugify('..'))).toBe(false);
		});
	});

	describe('pagination.create', () => {
		test('should remove cache-busting query parameters from created links', () => {
			const data = pagination.create(1, 3, {
				sort: 'newest',
				_: 'cache-buster',
			});

			expect(data.pages[0].qs).toBe('sort=newest&page=1');
			expect(data.next.qs.includes('_=')).toBe(false);
		});

		test('should not allow previous and next links to leave the available page range', () => {
			const firstPage = pagination.create(1, 5);
			const lastPage = pagination.create(5, 5);

			expect(firstPage.prev.page).toBe(1);
			expect(firstPage.prev.active).toBe(false);
			expect(lastPage.next.page).toBe(5);
			expect(lastPage.next.active).toBe(false);
		});
	});

	describe('ratelimit.isFlooding', () => {
		let originalNow;

		beforeEach(() => {
			originalNow = Date.now;
			Date.now = () => 1000;
		});

		afterEach(() => {
			Date.now = originalNow;
		});

		test('should flag a socket after too many calls inside the configured timeframe', () => {
			const warn = jestGlobals.spyOn(winston, 'warn').mockImplementation(() => {});
			const socket = {};
			let flooding = false;

			for (let i = 0; i < 101; i += 1) {
				flooding = ratelimit.isFlooding(socket);
			}

			expect(flooding).toBe(true);
			expect(warn).toHaveBeenCalledWith('Flooding detected! Calls : 101, Duration : 0');
			warn.mockRestore();
		});
	});

	describe('password', () => {
		test('should match the original password against a created hash', async () => {
			const hash = await password.hash(1, 'nodebb-secret-password');

			await expect(password.compare('nodebb-secret-password', hash, true)).resolves.toBe(true);
			await expect(password.compare('wrong-password', hash, true)).resolves.toBe(false);
		});
	});

	describe('utils validation helpers', () => {
		test('should accept valid email addresses and reject malformed ones', () => {
			expect(utils.isEmailValid('student@example.org')).toBe(true);
			expect(utils.isEmailValid('student.example.org')).toBe(false);
		});

		test('should reject usernames containing invisible control characters', () => {
			expect(utils.isUserNameValid('visible-user')).toBe(true);
			expect(utils.isUserNameValid('hidden\u200Buser')).toBe(false);
		});

		test('should classify numeric values consistently for ids and counters', () => {
			expect(utils.isNumber('42')).toBe(true);
			expect(utils.isNumber('42px')).toBe(false);
		});

		test('should identify relative URLs used for local uploads and reject external URLs', () => {
			expect(utils.isRelativeUrl('/assets/uploads/profile.png')).toBe(true);
			expect(utils.isRelativeUrl('https://example.org/profile.png')).toBe(false);
		});
	});
});
