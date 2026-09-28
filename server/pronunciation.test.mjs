import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRequest, validateResult, generatePronunciation } from './pronunciation.mjs';

const request = { target: 'ko', lines: [{ id: 'line-0', text: '오늘도 Hello!' }] };
const result = () => ({ target: 'ko', lines: [{ id: 'line-0', segments: [
  { source: '오늘도 ', language: 'ko', reading: null, pronunciation: null, needsReview: false },
  { source: 'Hello!', language: 'en', reading: null, pronunciation: '헬로!', needsReview: false },
] }] });
test('preserves exact mixed source partition', () => {
  assert.deepEqual(validateResult(validateRequest(request), result()), result());
});
test('rejects unsupported targets, extra fields, duplicated IDs and unbounded input', () => {
  for (const bad of [ { ...request, target: 'fr' }, { ...request, key: 'secret' },
    { ...request, lines: [...request.lines, ...request.lines] },
    { ...request, lines: [{ id: 'line-0', text: 'x'.repeat(501) }] },
  ]) assert.throws(() => validateRequest(bad));
});
test('rejects source mutation, IDs, unknown fields, unsupported language and same-language rewriting', () => {
  for (const mutate of [
    r => r.lines[0].segments[0].source = '오늘 ',
    r => r.lines[0].id = 'wrong',
    r => r.lines[0].segments[0].extra = true,
    r => r.lines[0].segments[0].language = 'fr',
    r => r.lines[0].segments[0].pronunciation = 'rewritten',
    r => r.lines[0].segments[1].needsReview = true,
    r => r.lines[0].segments[1].pronunciation = null,
    r => r.lines[0].segments[1].pronunciation = '   ',
  ]) { const value = result(); mutate(value); assert.throws(() => validateResult(request, value)); }
});
test('provider uses fixed model, no storage, strict schema; refuses incomplete or refused output', async () => {
  let sent;
  const fetcher = async (_, options) => {
    assert.equal(options.redirect, 'error');
    sent = JSON.parse(options.body);
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(result()) }] }], usage: { input_tokens: 1, output_tokens: 2 } });
  };
  const response = await generatePronunciation(request, 'fixture-key', { fetcher });
  assert.deepEqual(response.result, result());
  assert.equal(sent.store, false);
  assert.equal(sent.text.format.strict, true);
  assert.equal(sent.model, 'gpt-5.4-mini-2026-03-17');
  for (const body of [{ status: 'incomplete' }, { status: 'completed', output: [{ content: [{ type: 'refusal' }] }] }]) {
    await assert.rejects(generatePronunciation(request, 'fixture-key', { fetcher: async () => Response.json(body) }));
  }
});

test('local HTTP boundary rejects browser origins, malformed data and concurrent calls', async t => {
  const { createPronunciationServer } = await import('./index.mjs');
  let finish, calls=0;
  const server=createPronunciationServer('fixture-key', async()=> {calls++; return new Promise(resolve=>{finish=()=>resolve({result:result()});});});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>server.close());
  const url=`http://127.0.0.1:${server.address().port}/pronunciation`;
  const options={method:'POST',headers:{'Content-Type':'application/json','X-SingBridge-Client':'native-dev'},body:JSON.stringify(request)};
  assert.equal((await fetch(url,{...options,headers:{...options.headers,Origin:'https://untrusted.example'}})).status,403);
  assert.equal((await fetch(url,{...options,body:'{}'})).status,400);
  assert.equal((await fetch(url,{...options,body:'x'.repeat(32769)})).status,413);
  assert.equal(calls,0);
  const pending=fetch(url,options);
  while(!finish) await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await fetch(url,options)).status,429);
  finish(); assert.equal((await pending).status,200); assert.equal(calls,1);
});
