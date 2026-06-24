import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 499 }));

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4568';
const SMOKE = __ENV.SMOKE === '1';
const PUBLIC_VUS = SMOKE ? 1 : 3;
const API_VUS = SMOKE ? 1 : 5;
const LOGIN_VUS = SMOKE ? 1 : 2;
const SCENARIO_DURATION = SMOKE ? '5s' : '20s';
const API_START_TIME = SMOKE ? '7s' : '25s';
const LOGIN_START_TIME = SMOKE ? '14s' : '50s';

export const homepageDuration = new Trend('homepage_duration');
export const apiConfigDuration = new Trend('api_config_duration');
export const invalidLoginHandled = new Rate('invalid_login_handled');

export const options = {
	scenarios: {
		public_forum_browsing: {
			executor: 'constant-vus',
			exec: 'publicForumBrowsing',
			vus: PUBLIC_VUS,
			duration: SCENARIO_DURATION,
			tags: { test_type: 'public_forum_browsing' },
		},
		config_api_reads: {
			executor: 'constant-vus',
			exec: 'configApiReads',
			vus: API_VUS,
			duration: SCENARIO_DURATION,
			startTime: API_START_TIME,
			tags: { test_type: 'config_api_reads' },
		},
		invalid_login_attempts: {
			executor: 'constant-vus',
			exec: 'invalidLoginAttempts',
			vus: LOGIN_VUS,
			duration: SCENARIO_DURATION,
			startTime: LOGIN_START_TIME,
			tags: { test_type: 'invalid_login_attempts' },
		},
	},
	thresholds: {
		http_req_failed: ['rate<0.05'],
		http_req_duration: ['p(95)<1000'],
		homepage_duration: ['p(95)<1000'],
		api_config_duration: ['p(95)<500'],
		invalid_login_handled: ['rate>0.95'],
	},
};

export function publicForumBrowsing() {
	const home = http.get(`${BASE_URL}/`);
	const homeBody = String(home.body || '');
	homepageDuration.add(home.timings.duration);
	check(home, {
		'homepage responds successfully': response => response.status >= 200 && response.status < 400,
		'homepage contains html': () => homeBody.includes('<html'),
	});

	const login = http.get(`${BASE_URL}/login`);
	const loginBody = String(login.body || '');
	check(login, {
		'login page responds successfully': response => response.status >= 200 && response.status < 400,
		'login form is rendered': () => loginBody.includes('id="login-form"'),
	});

	sleep(1);
}

export function configApiReads() {
	const response = http.get(`${BASE_URL}/api/config`);
	apiConfigDuration.add(response.timings.duration);

	check(response, {
		'config api responds with 200': res => res.status === 200,
		'config api returns csrf token': res => {
			try {
				return Boolean(res.json('csrf_token'));
			} catch (err) {
				return false;
			}
		},
	});

	sleep(0.5);
}

export function invalidLoginAttempts() {
	const loginPage = http.get(`${BASE_URL}/login`);
	const loginPageBody = String(loginPage.body || '');
	const csrfMatch = loginPageBody.match(/name="_csrf" value="([^"]+)"/);
	const csrfToken = csrfMatch ? csrfMatch[1] : '';

	const response = http.post(`${BASE_URL}/login`, {
		username: `missing-user-${__VU}-${__ITER}`,
		password: 'WrongPassword123!',
		_csrf: csrfToken,
		noscript: 'true',
	}, {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	});

	const handled = check(response, {
		'invalid login is handled without server error': res => res.status >= 200 && res.status < 500,
		'invalid login does not authenticate': res => {
			const body = String(res.body || '');
			return body.includes('login-error-notify') || body.includes('invalid-login-credentials');
		},
	});
	invalidLoginHandled.add(handled);

	sleep(1);
}
