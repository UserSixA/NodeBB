'use strict';

const assert = require('assert');

const password = require('../src/password');
const pagination = require('../src/pagination');
const ratelimit = require('../src/middleware/ratelimit');
const slugify = require('../src/slugify');
const utils = require('../src/utils');

describe('NodeBB Custom Unit Tests', () => {
	describe('slugify', () => {
		it('should create a URL-safe slug from a topic title', () => {
			assert.strictEqual(slugify('NodeBB Test Topic 2026'), 'nodebb-test-topic-2026');
		});

		it('should reject dot-only slugs after normalization', () => {
			assert.strictEqual(slugify('.'), '');
			assert.strictEqual(slugify('..'), '');
			assert.strictEqual(utils.isSlugValid(slugify('..')), false);
		});
	});

	describe('pagination.create', () => {
		it('should remove cache-busting query parameters from created links', () => {
			const data = pagination.create(1, 3, {
				sort: 'newest',
				_: 'cache-buster',
			});

			assert.strictEqual(data.pages[0].qs, 'sort=newest&page=1');
			assert(!data.next.qs.includes('_='));
		});

		it('should not allow previous and next links to leave the available page range', () => {
			const firstPage = pagination.create(1, 5);
			const lastPage = pagination.create(5, 5);

			assert.strictEqual(firstPage.prev.page, 1);
			assert.strictEqual(firstPage.prev.active, false);
			assert.strictEqual(lastPage.next.page, 5);
			assert.strictEqual(lastPage.next.active, false);
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

		it('should flag a socket after too many calls inside the configured timeframe', () => {
			const socket = {};
			let flooding = false;

			for (let i = 0; i < 101; i += 1) {
				flooding = ratelimit.isFlooding(socket);
			}

			assert.strictEqual(flooding, true);
		});
	});

	describe('password', () => {
		it('should match the original password against a created hash', async () => {
			const hash = await password.hash(1, 'nodebb-secret-password');

			assert.strictEqual(await password.compare('nodebb-secret-password', hash, true), true);
			assert.strictEqual(await password.compare('wrong-password', hash, true), false);
		});
	});

	describe('utils validation helpers', () => {
		it('should accept valid email addresses and reject malformed ones', () => {
			assert.strictEqual(utils.isEmailValid('student@example.org'), true);
			assert.strictEqual(utils.isEmailValid('student.example.org'), false);
		});

		it('should reject usernames containing invisible control characters', () => {
			assert.strictEqual(utils.isUserNameValid('visible-user'), true);
			assert.strictEqual(utils.isUserNameValid('hidden\u200Buser'), false);
		});

		it('should classify numeric values consistently for ids and counters', () => {
			assert.strictEqual(utils.isNumber('42'), true);
			assert.strictEqual(utils.isNumber('42px'), false);
		});

		it('should identify relative URLs used for local uploads and reject external URLs', () => {
			assert.strictEqual(utils.isRelativeUrl('/assets/uploads/profile.png'), true);
			assert.strictEqual(utils.isRelativeUrl('https://example.org/profile.png'), false);
		});
	});
});
