import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
// Execute the actual handler with provider dependencies isolated: no keys or network.
function route(env = {}, fetch = () => { throw new Error('Unexpected network'); }) {
  const source = readFileSync(new URL('../src/app/api/voice/route.ts', import.meta.url), 'utf8');
  const exports = {};
  const context = { exports, require: () => ({ PERSONA: 'Coach rules', COACH_KNOWLEDGE: 'Knowledge' }), process: { env }, Request, Response, FormData, Buffer, AbortSignal, URL, fetch };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return exports;
}
const enabled = { OPENAI_API_KEY: 'test-server-secret', OPENAI_REALTIME_ENABLED: 'true' };
const request = (body = { sdp: 'v=0\r\n', facts: 'Team facts' }, origin = 'https://coach.test') => new Request('https://coach.test/api/voice', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
test('disabled voice never calls provider or exposes credentials', async () => {
  const api = route({ OPENAI_API_KEY: 'secret' });
  assert.deepEqual(await (await api.GET()).json(), { configured: false });
  assert.equal((await api.POST(request())).status, 503);
});
test('rejects other origins, invalid input and oversized requests', async () => {
  const api = route(enabled);
  assert.equal((await api.POST(request(undefined, 'https://other.test'))).status, 403);
  assert.equal((await api.POST(request(null))).status, 400);
  assert.equal((await api.POST(request({ sdp: 'bad', facts: '' }))).status, 400);
  assert.equal((await api.POST(request({ sdp: 'v=0', facts: 'x'.repeat(101000) }))).status, 413);
});
test('server exchanges SDP with interruptible audio; key stays on server', async () => {
  let calls = 0;
  const api = route(enabled, async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.openai.com/v1/realtime/calls');
    assert.equal(init.headers.Authorization, 'Bearer test-server-secret');
    const config = JSON.parse(init.body.get('session'));
    assert.equal(config.audio.input.turn_detection.interrupt_response, true);
    assert.match(config.instructions, /Team facts/);
    return new Response('v=0\r\nANSWER');
  });
  const result = await api.POST(request());
  assert.equal(result.status, 200);
  assert.equal(await result.text(), 'v=0\r\nANSWER');
  assert.equal(calls, 1);
});
test('provider failure is sanitized and repeated starts are limited', async () => {
  const api = route(enabled, async () => new Response('private provider details', { status: 401 }));
  for (let i = 0; i < 5; i++) {
    const res = await api.POST(request());
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'voice_unavailable' });
  }
  assert.equal((await api.POST(request())).status, 429);
});
