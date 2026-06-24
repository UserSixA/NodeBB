'use strict';

const assert = require('assert');

const db = require('./mocks/databasemock');
const categories = require('../src/categories');
const groups = require('../src/groups');
const posts = require('../src/posts');
const topics = require('../src/topics');
const User = require('../src/user');
const utils = require('../src/utils');

describe('NodeBB Custom Integration Tests', () => {
	let uid;
	let cid;
	let tid;

	it('should create a user and verify the stored password hash through the password module', async () => {
		const unique = utils.generateUUID().slice(0, 8);
		const plainPassword = 'NodeBBPassword123!';

		uid = await User.create({
			username: `custom-user-${unique}`,
			email: `custom-user-${unique}@example.org`,
			password: plainPassword,
		}, {
			emailVerification: 'verify',
		});

		const userData = await User.getUserData(uid);

		assert.strictEqual(userData.uid, uid);
		assert.strictEqual(userData.username, `custom-user-${unique}`);
		assert.strictEqual(userData.email, `custom-user-${unique}@example.org`);
		assert.strictEqual(await User.isPasswordCorrect(uid, plainPassword, '127.0.0.1'), true);
	});

	it('should create and retrieve a category with sanitized display data', async () => {
		const unique = utils.generateUUID().slice(0, 8);

		const category = await categories.create({
			name: `Custom Category & NodeBB ${unique}`,
			description: 'Integration test category',
		});
		cid = category.cid;

		const categoryData = await categories.getCategoryById({
			cid,
			start: 0,
			stop: -1,
			uid: 0,
		});

		assert.strictEqual(categoryData.cid, cid);
		assert(categoryData.name.includes('Custom Category &amp; NodeBB'));
		assert.strictEqual(categoryData.description, 'Integration test category');
	});

	it('should create a topic, add a reply, and persist both posts in the topic', async () => {
		const topicResult = await topics.post({
			uid,
			cid,
			title: 'Custom integration topic',
			content: 'Initial post created by the custom integration test',
		});
		tid = topicResult.topicData.tid;

		const replyData = await topics.reply({
			uid,
			tid,
			content: 'Reply created by the custom integration test',
		});

		const topicData = await topics.getTopicData(tid);
		const firstPost = await posts.getPostData(topicResult.postData.pid);
		const replyPost = await posts.getPostData(replyData.pid);

		assert.strictEqual(topicData.tid, tid);
		assert.strictEqual(topicData.cid, cid);
		assert.strictEqual(topicData.postcount, 2);
		assert.strictEqual(firstPost.content, 'Initial post created by the custom integration test');
		assert.strictEqual(replyPost.content, 'Reply created by the custom integration test');
	});

	it('should expose the created topic through the category topic list', async () => {
		const result = await categories.getCategoryTopics({
			cid,
			start: 0,
			stop: 10,
			uid: 0,
		});

		assert(Array.isArray(result.topics));
		assert(result.topics.some(topic => topic.tid === tid));
	});

	it('should add the created user to a group and report the membership', async () => {
		const groupName = `custom-group-${utils.generateUUID().slice(0, 8)}`;

		await groups.create({
			name: groupName,
			description: 'Custom integration group',
		});
		await groups.join(groupName, uid);

		assert.strictEqual(await groups.isMember(uid, groupName), true);
	});

	it('should reject topic creation when the category does not exist', async () => {
		try {
			await topics.post({
				uid,
				cid: 999999,
				title: 'Custom invalid category topic',
				content: 'This topic should not be created',
			});
			assert.fail('Expected topic creation to fail for an invalid category');
		} catch (err) {
			assert.strictEqual(err.message, '[[error:no-category]]');
		}
	});
});
