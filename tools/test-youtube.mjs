import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const kotlin = readFileSync(new URL('../shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubeEmbed.kt', import.meta.url), 'utf8');
const html = kotlin.split('"""')[1];
assert.ok(html, 'Missing shipped HTML');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
assert.ok(script, 'Missing shipped script');
const lyricsPath = new URL('../shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubeLyrics.kt', import.meta.url);
const lyricsHtml = readFileSync(lyricsPath, 'utf8').split('"""')[1];
const lyricsScript = [...lyricsHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');

function fixture(respond = async () => new Response('[]')) {
  const elements = new Map();
  function node() { return { value: '', textContent: '', disabled: true, hidden: false, children: [], addEventListener(type, fn) { this[type] = fn; }, replaceChildren(...children) { this.children = children; }, append(...children) { this.children.push(...children); }, set innerHTML(_) { throw new Error('Untrusted HTML insertion'); } }; }
  function element(id) {
    if (!elements.has(id)) elements.set(id, node());
    return elements.get(id);
  }
  const players = [];
  const intervals = [];
  const timeouts = [];
  const document = { hidden: false, getElementById: element, createElement: node, addEventListener(type, fn) { this[type] = fn; } };
  const window = {};
  const requests = [];
  let now = 1700000000000;
  let intersection;
  const context = vm.createContext({
    document, window, URL, console, TextEncoder, TextDecoder, AbortController,
    Date: class extends Date { static now() { return now; } },
    fetch: async (url, options) => { requests.push({ url, options }); return respond(url, options); },
    setInterval: fn => intervals.push(fn), setTimeout: fn => timeouts.push(fn), clearTimeout() {},
    IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} },
    YT: { Player: class {
      constructor(id, options) { this.options = options; this.position = 10; this.duration = 100; this.pauses = 0; this.destroyed = false; players.push(this); }
      pauseVideo() { this.pauses++; }
      destroy() { this.destroyed = true; }
      getCurrentTime() { return this.position; }
      getDuration() { return this.duration; }
      getPlayerState() { return 2; }
      seekTo(value, allowSeekAhead) { this.position = value; this.seek = [value, allowSeekAhead]; }
    } },
  });
  // Match the script order in the shipped HTML, including deferred function references.
  vm.runInContext(lyricsScript, context);
  vm.runInContext(script, context);
  return { context, element, window, document, players, intervals, timeouts, requests, advance(ms) { now += ms; }, tick() { intervals.forEach(fn => fn()); }, async search(query = 'SingBridge original') { element('lyrics-query').value = query; await element('lyrics-search').submit?.({ preventDefault() {} }); }, select(index = 0) { element('lyrics-results').children[index].click(); }, visibility: ratio => intersection([{ intersectionRatio: ratio }]), submit(input = 'M7lc1UVf-VE') { element('video-url').value = input; element('open').submit({ preventDefault() {} }); }, ready() { window.onYouTubeIframeAPIReady(); this.visibility(1); this.submit(); players.at(-1).options.events.onReady(); } };
}

test('accepts supported YouTube links and exact IDs', () => {
  const { context } = fixture();
  for (const input of ['M7lc1UVf-VE', 'https://www.youtube.com/watch?v=M7lc1UVf-VE&t=2', 'https://youtu.be/M7lc1UVf-VE?si=abc', 'https://m.youtube.com/shorts/M7lc1UVf-VE', 'https://www.youtube.com/embed/M7lc1UVf-VE', 'https://www.youtube.com/live/M7lc1UVf-VE']) {
    assert.equal(context.videoId(input), 'M7lc1UVf-VE', input);
  }
});
test('rejects unrelated hosts, credentials, scripts, and malformed IDs', () => {
  const { context } = fixture();
  for (const input of ['', '<script>x</script>', 'javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=M7lc1UVf-VE', 'https://evil@youtube.com/watch?v=M7lc1UVf-VE', 'https://youtu.be/M7lc1UVf-VE/extra', 'https://youtube.com/watch?v=short', 'http://youtube.com/watch?v=M7lc1UVf-VE', 'https://youtube.com:444/watch?v=M7lc1UVf-VE']) assert.equal(context.videoId(input), null, input);
});
test('does not create a player before API readiness or for invalid input', () => {
  const f = fixture(); f.submit(); assert.equal(f.players.length, 0);
  f.window.onYouTubeIframeAPIReady(); f.submit('invalid'); assert.equal(f.players.length, 0);
});
test('uses official controls, no autoplay, and reads real player time', () => {
  const f = fixture(); f.ready(); const p = f.players[0];
  assert.equal(p.options.playerVars.autoplay, 0); assert.equal(p.options.playerVars.controls, 1);
  p.position = 42; f.intervals.forEach(fn => fn()); assert.match(f.element('position').textContent, /0:42/);
  assert.equal(f.element('forward').disabled, false);
});
test('bounds seeks by duration and ignores unknown duration', () => {
  const f = fixture(); f.ready(); const p = f.players[0];
  p.position = 99; f.element('forward').click(); assert.deepEqual(p.seek, [100, true]);
  p.position = 2; f.element('back').click(); assert.deepEqual(p.seek, [0, true]);
  p.duration = 0; p.seek = null; f.element('forward').click(); assert.equal(p.seek, null);
});
test('pauses on native background, document hide, and loss of visibility', () => {
  const f = fixture(); f.ready(); const p = f.players[0];
  f.window.singBridgePause(); assert.equal(p.pauses, 1);
  p.options.events.onStateChange({ data: 1 }); assert.equal(p.pauses, 2);
  f.window.singBridgeResume(); assert.equal(p.pauses, 2);
  f.document.hidden = true; f.document.visibilitychange(); assert.equal(p.pauses, 3);
  f.document.hidden = false; f.visibility(0.4); assert.equal(p.pauses, 4);
});
test('replacing a video destroys old player and rejects stale callbacks', () => {
  const f = fixture(); f.ready(); const old = f.players[0]; f.submit('dQw4w9WgXcQ');
  assert.equal(old.destroyed, true); old.options.events.onReady(); assert.equal(f.element('forward').disabled, true);
  old.options.events.onError({ data: 153 }); assert.doesNotMatch(f.element('status').textContent, /153/);
  f.players[1].options.events.onReady(); assert.equal(f.element('forward').disabled, false);
});
test('embedding failures disable seeks and allow choosing another video', () => {
  const f = fixture(); f.ready(); f.players[0].options.events.onError({ data: 150 });
  assert.equal(f.element('forward').disabled, true); assert.match(f.element('status').textContent, /다른 영상/);
  f.submit('dQw4w9WgXcQ'); assert.equal(f.players.length, 2);
});
test('preserves specific embedding errors when the loading timeout fires', () => {
  const f = fixture(); f.ready(); f.players[0].options.events.onError({ data: 153 });
  f.timeouts.forEach(fn => fn());
  assert.match(f.element('status').textContent, /153/);
});

const record = { id: 42, trackName: 'Original <song>', artistName: 'SingBridge', albumName: 'Test', duration: 100, instrumental: false, plainLyrics: 'First\nSecond', syncedLyrics: '[00:02.00]First\n[00:05.00]Second\n[00:08.00]' };
const response = (records = [record]) => new Response(JSON.stringify(records), { headers: { 'Content-Type': 'application/json' } });

test('search identifies the client and waits for explicit candidate selection', async () => {
  const f = fixture(() => response()); f.ready(); await f.search('Song & artist');
  assert.equal(f.requests.length, 1);
  const request = f.requests[0]; assert.equal(new URL(request.url).searchParams.get('q'), 'Song & artist');
  assert.match(request.options.headers['Lrclib-Client'], /SingBridge.*github.com/);
  assert.equal(f.element('lyrics-results').children.length, 1);
  assert.match(f.element('lyrics-results').children[0].textContent, /Original <song>/);
  assert.equal(f.element('lyric-current').textContent, '');
  f.select(); f.players[0].position = 2; f.tick(); assert.equal(f.element('lyric-current').textContent, 'First');
});

test('timed lines use actual playback boundaries, blank markers and signed offsets', async () => {
  const f = fixture(() => response()); f.ready(); await f.search(); f.select();
  for (const [position, expected] of [[1.99, ''], [2, 'First'], [5, 'Second'], [8, ''], [100, '']]) {
    f.players[0].position = position; f.tick(); assert.equal(f.element('lyric-current').textContent, expected);
  }
  f.element('lyrics-offset').value = '2'; f.element('lyrics-offset').change();
  f.players[0].position = 3; f.tick(); assert.equal(f.element('lyric-current').textContent, '');
  f.players[0].position = 4; f.tick(); assert.equal(f.element('lyric-current').textContent, 'First');
  f.element('lyrics-offset').value = '-1'; f.element('lyrics-offset').change();
  f.players[0].position = 4; f.tick(); assert.equal(f.element('lyric-current').textContent, 'Second');
});

test('plain lyrics stay unsynchronized and provider markup remains text', async () => {
  const f = fixture(() => response([{ ...record, syncedLyrics: null, plainLyrics: '<img src=x onerror=alert(1)>\nOriginal' }]));
  f.ready(); await f.search(); f.select(); f.tick();
  assert.match(f.element('lyrics-status').textContent, /시간표시/);
  assert.equal(f.element('lyrics-plain').textContent, '<img src=x onerror=alert(1)>\nOriginal');
  assert.equal(f.element('lyric-current').textContent, ''); assert.equal(f.element('lyrics-offset').disabled, true);
});

test('changing video aborts and discards stale search results', async () => {
  let resolve; const f = fixture(() => new Promise(r => { resolve = r; })); f.ready();
  const pending = f.search(); assert.equal(f.requests.length, 1); f.submit('dQw4w9WgXcQ');
  resolve(response()); await pending;
  assert.equal(f.element('lyrics-results').children.length, 0);
  assert.equal(f.element('lyrics-offset').value, '0'); assert.equal(f.requests[0].options.signal.aborted, true);
});

test('rate limiting honors Retry-After without an automatic retry', async () => {
  const f = fixture(() => new Response('', { status: 429, headers: { 'Retry-After': '120' } })); f.ready();
  await f.search(); await f.search(); assert.equal(f.requests.length, 1);
  f.advance(119000); await f.search(); assert.equal(f.requests.length, 1);
  f.advance(1000); await f.search(); assert.equal(f.requests.length, 2);
});

test('empty, malformed and oversized responses report errors without selectable records', async () => {
  for (const make of [() => response([]), () => response({ records: [record] }), () => new Response('x'.repeat(4 * 1024 * 1024 + 1)), () => { throw new Error('offline'); }]) {
    const f = fixture(make); f.ready(); await f.search();
    assert.equal(f.element('lyrics-results').children.length, 0);
    assert.ok(f.element('lyrics-status').textContent.length > 0);
    assert.equal(f.element('lyrics-search-button').disabled, false);
  }
});

test('searches are sequential and timeout aborts the request', async () => {
  const f = fixture((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))));
  f.ready(); const pending = f.search(); await f.search(); assert.equal(f.requests.length, 1);
  f.timeouts.at(-1)(); await pending; assert.equal(f.requests[0].options.signal.aborted, true);
  assert.equal(f.element('lyrics-search-button').disabled, false);
});

test('multi-timestamp and same-time lyrics merge, unsupported offsets fail explicitly', async () => {
  const f = fixture(() => response([{ ...record, syncedLyrics: '[ti:Original]\n[00:02.00][00:06.000]Echo\n[00:02.00]Harmony\n[00:08.00]' }]));
  f.ready(); await f.search(); f.select(); f.players[0].position = 2; f.tick();
  assert.equal(f.element('lyric-current').textContent, 'Echo\nHarmony');
  f.players[0].position = 6; f.tick(); assert.equal(f.element('lyric-current').textContent, 'Echo');
  const bad = fixture(() => response([{ ...record, syncedLyrics: '[offset:100]\n[00:02.00]Line', plainLyrics: null }]));
  bad.ready(); await bad.search(); bad.select();
  assert.match(bad.element('lyrics-status').textContent, /offset/); assert.equal(bad.element('lyric-current').textContent, '');
});


test('replacing a video clears an existing selection and its offset', async () => {
  const f = fixture(() => response()); f.ready(); await f.search(); f.select();
  f.element('lyrics-offset').value = '2'; f.element('lyrics-offset').change();
  f.players[0].position = 4; f.tick(); assert.equal(f.element('lyric-current').textContent, 'First');
  f.submit('dQw4w9WgXcQ');
  assert.equal(f.element('lyric-current').textContent, '');
  assert.equal(f.element('lyrics-source').textContent, '');
  assert.equal(f.element('lyrics-offset').value, '0');
  assert.equal(f.element('lyrics-offset').disabled, true);
});

test('search requires a ready video and a bounded query', async () => {
  const f = fixture(); await f.search(); assert.equal(f.requests.length, 0);
  f.ready(); await f.search(' '); await f.search('x'.repeat(121));
  assert.equal(f.requests.length, 0);
});

test('unsuccessful responses abort their unread body without changing the error message', async () => {
  for (const status of [429, 503]) {
    const f = fixture(() => new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(1024)); } }), { status }));
    f.ready(); await f.search();
    assert.equal(f.requests[0].options.signal.aborted, true);
    assert.doesNotMatch(f.element('lyrics-status').textContent, /시간이 초과/);
  }
});
