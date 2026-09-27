import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const kotlin = readFileSync(new URL('../shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubeEmbed.kt', import.meta.url), 'utf8');
const html = kotlin.split('"""')[1];
assert.ok(html, 'Missing shipped HTML');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
assert.ok(script, 'Missing shipped script');

function fixture() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, { value: '', textContent: '', disabled: true, addEventListener(type, fn) { this[type] = fn; }, replaceChildren() {} });
    return elements.get(id);
  }
  const players = [];
  const intervals = [];
  const timeouts = [];
  const document = { hidden: false, getElementById: element, createElement: () => ({}), addEventListener(type, fn) { this[type] = fn; } };
  const window = {};
  let intersection;
  const context = vm.createContext({
    document, window, URL, console,
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
  vm.runInContext(script, context);
  return { context, element, window, document, players, intervals, timeouts, visibility: ratio => intersection([{ intersectionRatio: ratio }]), submit(input = 'M7lc1UVf-VE') { element('video-url').value = input; element('open').submit({ preventDefault() {} }); }, ready() { window.onYouTubeIframeAPIReady(); this.visibility(1); this.submit(); players.at(-1).options.events.onReady(); } };
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
