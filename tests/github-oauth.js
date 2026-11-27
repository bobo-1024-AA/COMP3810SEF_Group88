const assert = require('node:assert/strict');
const p = require('node:path').resolve(__dirname, '..');
const mongoose = require(p + '/node_modules/mongoose');
const express = require(p + '/node_modules/express');
const session = require(p + '/node_modules/express-session');
const MongoStore = require(p + '/node_modules/connect-mongo');
const User = require(p + '/models/User');
const realFetch = global.fetch;
const crypto = require('node:crypto');
let expectedChallenge;
let networkFailure = false;
const user = { id: 'u1', _id: 'u1', role: 'student' };
User.findOne = async (q) => (q.githubId === '123' ? user : null);
User.findById = () => ({ lean: async () => user });
mongoose.connect = async () => {};
MongoStore.create = () => new session.MemoryStore();
Object.assign(process.env, {
  MONGODB_URI: 'mongodb://127.0.0.1/test',
  SESSION_SECRET: 'test-only-secret',
  GITHUB_CLIENT_ID: 'test-client',
  GITHUB_CLIENT_SECRET: 'test-secret',
  APP_BASE_URL: 'http://localhost:3000',
  NODE_ENV: 'development',
});
delete process.env.SAO_EMAIL;
delete process.env.SAO_PASSWORD;
global.fetch = async (url, options) => {
  if (String(url).startsWith('http://127.0.0.1:'))
    return realFetch(url, options);
  if (url === 'https://github.com/login/oauth/access_token') {
    if (networkFailure) throw new Error('Simulated network error');
    const verifier = JSON.parse(options.body).code_verifier;
    assert.equal(
      crypto.createHash('sha256').update(verifier).digest('base64url'),
      expectedChallenge,
    );
    return new Response(JSON.stringify({ access_token: 'test-token' }));
  }
  if (url === 'https://api.github.com/user')
    return new Response(JSON.stringify({ id: 123, login: 'test' }));
  if (url === 'https://api.github.com/user/emails')
    return new Response(
      JSON.stringify([
        { email: 'user@example.test', primary: true, verified: true },
      ]),
    );
  throw Error('Unexpected URL');
};
const originalListen = express.application.listen;
express.application.listen = function (_, cb) {
  const server = originalListen.call(this, 0, '127.0.0.1', async () => {
    try {
      const base = `http://127.0.0.1:${server.address().port}`;
      async function start() {
        const r = await realFetch(base + '/auth/github', {
          redirect: 'manual',
        });
        assert.equal(r.status, 302);
        const url = new URL(r.headers.get('location'));
        const cookie = r.headers.get('set-cookie').split(';')[0];
        assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
        expectedChallenge = url.searchParams.get('code_challenge');
        return { state: url.searchParams.get('state'), cookie };
      }
      let flow = await start();
      let r = await realFetch(
        base + '/auth/github/callback?state=' + flow.state + '&code=test',
        { headers: { cookie: flow.cookie }, redirect: 'manual' },
      );
      assert.equal(r.status, 302);
      assert.equal(r.headers.get('location'), '/');
      assert.match(r.headers.get('set-cookie'), /connect\.sid=/);
      r = await realFetch(
        base + '/auth/github/callback?state=' + flow.state + '&code=test',
        { headers: { cookie: flow.cookie }, redirect: 'manual' },
      );
      assert.equal(r.status, 400);
      assert.match(await r.text(), /Continue with GitHub/);
      flow = await start();
      r = await realFetch(
        base + '/auth/github/callback?state=wrong&code=test',
        { headers: { cookie: flow.cookie }, redirect: 'manual' },
      );
      assert.equal(r.status, 400);
      assert.match(await r.text(), /could not be verified/);
      flow = await start();
      r = await realFetch(
        base +
          '/auth/github/callback?state=' +
          flow.state +
          '&error=access_denied',
        { headers: { cookie: flow.cookie }, redirect: 'manual' },
      );
      assert.equal(r.status, 400);
      const html = await r.text();
      assert.match(html, /was cancelled/);
      assert.match(html, /Continue with GitHub/);
      flow = await start();
      networkFailure = true;
      r = await realFetch(
        base + '/auth/github/callback?state=' + flow.state + '&code=test',
        { headers: { cookie: flow.cookie }, redirect: 'manual' },
      );
      assert.equal(r.status, 502);
      assert.match(await r.text(), /Could not contact GitHub/);
      console.log(
        'GitHub OAuth tests passed: successful login, PKCE, state mismatch, replay, cancellation and network failure',
      );
    } catch (e) {
      console.error(e);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
  return server;
};
require(p + '/server.js');
