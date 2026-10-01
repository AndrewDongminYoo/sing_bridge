import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const kotlin = readFileSync(
  new URL(
    '../shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubeEmbed.kt',
    import.meta.url,
  ),
  'utf8',
);
const html = kotlin.split('"""')[1];
assert.ok(html, 'Missing shipped HTML');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .join('\n');
assert.ok(script, 'Missing shipped script');
const lyricsPath = new URL(
  '../shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubeLyrics.kt',
  import.meta.url,
);
const lyricsHtml = readFileSync(lyricsPath, 'utf8').split('"""')[1];
const lyricsScript = [...lyricsHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .join('\n');
const searchPath = new URL(
  '../shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubeSearch.kt',
  import.meta.url,
);
const searchHtml = readFileSync(searchPath, 'utf8').split('"""')[1];
const searchScript = [...searchHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .join('\n');

const libraryPath = new URL(
  '../shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubeLibrary.kt',
  import.meta.url,
);
const libraryHtml = readFileSync(libraryPath, 'utf8').split('"""')[1];
const libraryScript = [...libraryHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .join('\n');
const pronunciationHtml = readFileSync(
  new URL(
    '../shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubePronunciation.kt',
    import.meta.url,
  ),
  'utf8',
).split('"""')[1];
const pronunciationScript = [
  ...pronunciationHtml.matchAll(/<script>([\s\S]*?)<\/script>/g),
]
  .map((m) => m[1])
  .join('\n');
function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values,
  };
}
function fixture(
  respond = async () => new Response('[]'),
  apiKey = 'fixture-key',
  storage = memoryStorage(),
  start = 1700000000000,
) {
  const elements = new Map();
  function node(tagName = 'div') {
    return {
      tagName: tagName.toUpperCase(),
      attributes: {},
      style: {},
      clientHeight: 200,
      offsetHeight: 80,
      offsetTop: 0,
      scrollTop: 0,
      scrolls: [],
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      removeAttribute(name) {
        delete this.attributes[name];
      },
      scrollTo(options) {
        this.scrolls.push(options);
        this.scrollTop = options.top;
      },
      value: '',
      _text: '',
      get textContent() {
        return (
          this._text + this.children.map((child) => child.textContent).join('')
        );
      },
      set textContent(value) {
        this._text = value;
        this.children = [];
      },
      open: false,
      showModal() {
        this.open = true;
      },
      close() {
        this.open = false;
      },
      disabled: true,
      hidden: false,
      children: [],
      addEventListener(type, fn) {
        this[type] = fn;
      },
      replaceChildren(...children) {
        this._text = '';
        this.children = children;
      },
      append(...children) {
        for (const child of children) {
          child.offsetTop = this.children.length * 100;
          this.children.push(child);
        }
      },
      set innerHTML(_) {
        throw new Error('Untrusted HTML insertion');
      },
    };
  }
  function element(id) {
    if (!elements.has(id)) elements.set(id, node());
    return elements.get(id);
  }
  const players = [];
  const intervals = [];
  const timeouts = [];
  const document = {
    hidden: false,
    getElementById: element,
    createElement: node,
    addEventListener(type, fn) {
      this[type] = fn;
    },
  };
  const window = {
    // Chain listeners as a browser does: the pronunciation and share ports both listen for 'message'.
    addEventListener(type, fn) {
      const previous = this[type];
      this[type] = previous
        ? (event) => {
            previous(event);
            fn(event);
          }
        : fn;
    },
    matchMedia() {
      return { matches: this.reducedMotion || false };
    },
  };
  const requests = [];
  let now = start;
  let intersection;
  const context = vm.createContext({
    document,
    window,
    localStorage: storage,
    URL,
    console,
    TextEncoder,
    TextDecoder,
    AbortController,
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return respond(url, options);
    },
    setInterval: (fn) => intervals.push(fn),
    setTimeout: (fn) => timeouts.push(fn),
    clearTimeout() {},
    IntersectionObserver: class {
      constructor(fn) {
        intersection = fn;
      }
      observe() {}
    },
    YT: {
      Player: class {
        constructor(id, options) {
          this.options = options;
          this.position = 10;
          this.duration = 100;
          this.pauses = 0;
          this.destroyed = false;
          players.push(this);
        }
        setLoop(enabled) {
          this.loop = enabled;
        }
        pauseVideo() {
          this.pauses++;
        }
        playVideo() {
          this.plays = (this.plays || 0) + 1;
        }
        destroy() {
          this.destroyed = true;
        }
        getCurrentTime() {
          return this.position;
        }
        getDuration() {
          return this.duration;
        }
        getPlayerState() {
          return 2;
        }
        seekTo(value, allowSeekAhead) {
          this.position = value;
          this.seek = [value, allowSeekAhead];
        }
      },
    },
  });
  element('repeat-song').checked = true;
  // Match the script order in the shipped HTML, including deferred function references.
  vm.runInContext(searchScript.replace('__YOUTUBE_API_KEY__', apiKey), context);
  vm.runInContext(pronunciationScript, context);
  vm.runInContext(lyricsScript, context);
  vm.runInContext(libraryScript, context);
  vm.runInContext(script, context);
  return {
    context,
    element,
    window,
    document,
    currentLyric() {
      return (
        element('lyrics-timing').children.find(
          (n) => n.attributes['aria-current'] === 'true',
        ) || { textContent: '' }
      );
    },
    players,
    intervals,
    timeouts,
    requests,
    advance(ms) {
      now += ms;
    },
    tick() {
      intervals.forEach((fn) => fn());
    },
    async song(query = 'Vaundy - 踊り子') {
      element('song-query').value = query;
      await element('song-search').submit?.({ preventDefault() {} });
    },
    async search(query = 'SingBridge original') {
      element('lyrics-query').value = query;
      await element('lyrics-search').submit?.({ preventDefault() {} });
    },
    select(index = 0) {
      element('lyrics-results').children[index].click();
    },
    visibility: (ratio) => intersection([{ intersectionRatio: ratio }]),
    submit(input = 'M7lc1UVf-VE') {
      element('video-url').value = input;
      element('open').submit({ preventDefault() {} });
    },
    ready() {
      window.onYouTubeIframeAPIReady();
      this.visibility(1);
      this.submit();
      players.at(-1).options.events.onReady();
    },
  };
}

test('accepts supported YouTube links and exact IDs', () => {
  const { context } = fixture();
  for (const input of [
    'M7lc1UVf-VE',
    'https://www.youtube.com/watch?v=M7lc1UVf-VE&t=2',
    'https://youtu.be/M7lc1UVf-VE?si=abc',
    'https://m.youtube.com/shorts/M7lc1UVf-VE',
    'https://www.youtube.com/embed/M7lc1UVf-VE',
    'https://www.youtube.com/live/M7lc1UVf-VE',
  ]) {
    assert.equal(context.videoId(input), 'M7lc1UVf-VE', input);
  }
});
test('rejects unrelated hosts, credentials, scripts, and malformed IDs', () => {
  const { context } = fixture();
  for (const input of [
    '',
    '<script>x</script>',
    'javascript:alert(1)',
    'https://youtube.com.evil.test/watch?v=M7lc1UVf-VE',
    'https://evil@youtube.com/watch?v=M7lc1UVf-VE',
    'https://youtu.be/M7lc1UVf-VE/extra',
    'https://youtube.com/watch?v=short',
    'http://youtube.com/watch?v=M7lc1UVf-VE',
    'https://youtube.com:444/watch?v=M7lc1UVf-VE',
  ])
    assert.equal(context.videoId(input), null, input);
});
test('does not create a player before API readiness or for invalid input', () => {
  const f = fixture();
  f.submit();
  assert.equal(f.players.length, 0);
  f.window.onYouTubeIframeAPIReady();
  f.submit('invalid');
  assert.equal(f.players.length, 0);
});
test('uses official controls, no autoplay, and reads real player time', () => {
  const f = fixture();
  f.ready();
  const p = f.players[0];
  assert.equal(p.options.playerVars.autoplay, 0);
  assert.equal(p.options.playerVars.controls, 1);
  p.position = 42;
  f.intervals.forEach((fn) => fn());
  assert.match(f.element('position').textContent, /0:42/);
  assert.equal(f.element('forward').disabled, false);
});
test('bounds seeks by duration and ignores unknown duration', () => {
  const f = fixture();
  f.ready();
  const p = f.players[0];
  p.position = 99;
  f.element('forward').click();
  assert.deepEqual(p.seek, [100, true]);
  p.position = 2;
  f.element('back').click();
  assert.deepEqual(p.seek, [0, true]);
  p.duration = 0;
  p.seek = null;
  f.element('forward').click();
  assert.equal(p.seek, null);
});
test('pauses on native background, document hide, and loss of visibility', () => {
  const f = fixture();
  f.ready();
  const p = f.players[0];
  f.window.singBridgePause();
  assert.equal(p.pauses, 1);
  p.options.events.onStateChange({ data: 1 });
  assert.equal(p.pauses, 2);
  f.window.singBridgeResume();
  assert.equal(p.pauses, 2);
  f.document.hidden = true;
  f.document.visibilitychange();
  assert.equal(p.pauses, 3);
  f.document.hidden = false;
  f.visibility(0.4);
  assert.equal(p.pauses, 4);
});
test('replacing a video destroys old player and rejects stale callbacks', () => {
  const f = fixture();
  f.ready();
  const old = f.players[0];
  f.submit('dQw4w9WgXcQ');
  assert.equal(old.destroyed, true);
  old.options.events.onReady();
  assert.equal(f.element('forward').disabled, true);
  old.options.events.onError({ data: 153 });
  assert.doesNotMatch(f.element('status').textContent, /153/);
  f.players[1].options.events.onReady();
  assert.equal(f.element('forward').disabled, false);
});
test('embedding failures disable seeks and allow choosing another video', () => {
  const f = fixture();
  f.ready();
  f.players[0].options.events.onError({ data: 150 });
  assert.equal(f.element('forward').disabled, true);
  assert.match(f.element('status').textContent, /다른 영상/);
  f.submit('dQw4w9WgXcQ');
  assert.equal(f.players.length, 2);
});
test('preserves specific embedding errors when the loading timeout fires', () => {
  const f = fixture();
  f.ready();
  f.players[0].options.events.onError({ data: 153 });
  f.timeouts.forEach((fn) => fn());
  assert.match(f.element('status').textContent, /153/);
});

const record = {
  id: 42,
  trackName: 'Original <song>',
  artistName: 'SingBridge',
  albumName: 'Test',
  duration: 100,
  instrumental: false,
  plainLyrics: 'First\nSecond',
  syncedLyrics: '[00:02.00]First\n[00:05.00]Second\n[00:08.00]',
};
const response = (records = [record]) =>
  new Response(JSON.stringify(records), {
    headers: { 'Content-Type': 'application/json' },
  });

test('search identifies the client and waits for explicit candidate selection', async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search('Song & artist');
  assert.equal(f.requests.length, 1);
  const request = f.requests[0];
  assert.equal(new URL(request.url).searchParams.get('q'), 'Song & artist');
  assert.match(
    request.options.headers['Lrclib-Client'],
    /SingBridge.*github.com/,
  );
  assert.equal(f.element('lyrics-results').children.length, 1);
  assert.match(
    f.element('lyrics-results').children[0].textContent,
    /Original <song>/,
  );
  assert.equal(f.currentLyric().textContent, '');
  f.select();
  f.players[0].position = 2;
  f.tick();
  assert.equal(f.currentLyric().textContent, 'First');
});

test('timed lines use actual playback boundaries, blank markers and signed offsets', async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  for (const [position, expected] of [
    [1.99, ''],
    [2, 'First'],
    [5, 'Second'],
    [8, ''],
    [100, ''],
  ]) {
    f.players[0].position = position;
    f.tick();
    assert.equal(f.currentLyric().textContent, expected);
  }
  f.element('lyrics-offset').value = '2';
  f.element('lyrics-offset').change();
  f.players[0].position = 3;
  f.tick();
  assert.equal(f.currentLyric().textContent, '');
  f.players[0].position = 4;
  f.tick();
  assert.equal(f.currentLyric().textContent, 'First');
  f.element('lyrics-offset').value = '-1';
  f.element('lyrics-offset').change();
  f.players[0].position = 4;
  f.tick();
  assert.equal(f.currentLyric().textContent, 'Second');
});

test('plain lyrics stay unsynchronized and provider markup remains text', async () => {
  const f = fixture(() =>
    response([
      {
        ...record,
        syncedLyrics: null,
        plainLyrics: '<img src=x onerror=alert(1)>\nOriginal',
      },
    ]),
  );
  f.ready();
  await f.search();
  f.select();
  f.tick();
  assert.match(f.element('lyrics-status').textContent, /시간표시/);
  assert.equal(
    f.element('lyrics-plain').textContent,
    '<img src=x onerror=alert(1)>\nOriginal',
  );
  assert.equal(f.currentLyric().textContent, '');
  assert.equal(f.element('lyrics-offset').disabled, true);
});

test('changing video aborts and discards stale search results', async () => {
  let resolve;
  const f = fixture(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  f.ready();
  const pending = f.search();
  assert.equal(f.requests.length, 1);
  f.submit('dQw4w9WgXcQ');
  resolve(response());
  await pending;
  assert.equal(f.element('lyrics-results').children.length, 0);
  assert.equal(f.element('lyrics-offset').value, '0');
  assert.equal(f.requests[0].options.signal.aborted, true);
});

test('rate limiting honors Retry-After without an automatic retry', async () => {
  const f = fixture(
    () => new Response('', { status: 429, headers: { 'Retry-After': '120' } }),
  );
  f.ready();
  await f.search();
  await f.search();
  assert.equal(f.requests.length, 1);
  f.advance(119000);
  await f.search();
  assert.equal(f.requests.length, 1);
  f.advance(1000);
  await f.search();
  assert.equal(f.requests.length, 2);
});

test('empty, malformed and oversized responses report errors without selectable records', async () => {
  for (const make of [
    () => response([]),
    () => response({ records: [record] }),
    () => new Response('x'.repeat(4 * 1024 * 1024 + 1)),
    () => {
      throw new Error('offline');
    },
  ]) {
    const f = fixture(make);
    f.ready();
    await f.search();
    assert.equal(f.element('lyrics-results').children.length, 0);
    assert.ok(f.element('lyrics-status').textContent.length > 0);
    assert.equal(f.element('lyrics-search-button').disabled, false);
  }
});

test('searches are sequential and timeout aborts the request', async () => {
  const f = fixture(
    (_url, options) =>
      new Promise((_resolve, reject) =>
        options.signal.addEventListener('abort', () =>
          reject(new Error('aborted')),
        ),
      ),
  );
  f.ready();
  const pending = f.search();
  await f.search();
  assert.equal(f.requests.length, 1);
  f.timeouts.at(-1)();
  await pending;
  assert.equal(f.requests[0].options.signal.aborted, true);
  assert.equal(f.element('lyrics-search-button').disabled, false);
});

test('multi-timestamp and same-time lyrics merge, unsupported offsets fail explicitly', async () => {
  const f = fixture(() =>
    response([
      {
        ...record,
        syncedLyrics:
          '[ti:Original]\n[00:02.00][00:06.000]Echo\n[00:02.00]Harmony\n[00:08.00]',
      },
    ]),
  );
  f.ready();
  await f.search();
  f.select();
  f.players[0].position = 2;
  f.tick();
  assert.equal(f.currentLyric().textContent, 'Echo\nHarmony');
  f.players[0].position = 6;
  f.tick();
  assert.equal(f.currentLyric().textContent, 'Echo');
  const bad = fixture(() =>
    response([
      {
        ...record,
        syncedLyrics: '[offset:100]\n[00:02.00]Line',
        plainLyrics: null,
      },
    ]),
  );
  bad.ready();
  await bad.search();
  bad.select();
  assert.match(bad.element('lyrics-status').textContent, /offset/);
  assert.equal(bad.currentLyric().textContent, '');
});

test('replacing a video clears an existing selection and its offset', async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  f.element('lyrics-offset').value = '2';
  f.element('lyrics-offset').change();
  f.players[0].position = 4;
  f.tick();
  assert.equal(f.currentLyric().textContent, 'First');
  f.submit('dQw4w9WgXcQ');
  assert.equal(f.currentLyric().textContent, '');
  assert.equal(f.element('lyrics-source').textContent, '');
  assert.equal(f.element('lyrics-offset').value, '0');
  assert.equal(f.element('lyrics-offset').disabled, true);
});

test('search requires a ready video and a bounded query', async () => {
  const f = fixture();
  await f.search();
  assert.equal(f.requests.length, 0);
  f.ready();
  await f.search(' ');
  await f.search('x'.repeat(121));
  assert.equal(f.requests.length, 0);
});

test('unsuccessful responses abort their unread body without changing the error message', async () => {
  for (const status of [429, 503]) {
    const f = fixture(
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(1024));
            },
          }),
          { status },
        ),
    );
    f.ready();
    await f.search();
    assert.equal(f.requests[0].options.signal.aborted, true);
    assert.doesNotMatch(f.element('lyrics-status').textContent, /시간이 초과/);
  }
});

const youtubeResponse = () =>
  response({
    items: [
      {
        id: { videoId: '7HgJIAUtICU' },
        snippet: { title: '<Song>', channelTitle: 'Official artist' },
      },
    ],
  });

test('song search opens the top embeddable video and hands original terms to lyrics once ready', async () => {
  const f = fixture((url) =>
    new URL(url).hostname === 'www.googleapis.com'
      ? youtubeResponse()
      : response(),
  );
  f.window.onYouTubeIframeAPIReady();
  f.visibility(1);
  await f.song('G-Dragon - A Song - Live');
  assert.equal(f.requests.length, 1);
  const request = f.requests[0],
    query = new URL(request.url).searchParams;
  assert.equal(query.get('q'), 'G-Dragon A Song - Live');
  for (const [name, value] of Object.entries({
    part: 'snippet',
    type: 'video',
    order: 'relevance',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    maxResults: '1',
  }))
    assert.equal(query.get(name), value);
  assert.equal(request.options.headers['X-Goog-Api-Key'], 'fixture-key');
  assert.equal(query.has('key'), false);
  assert.equal(f.players[0].options.videoId, '7HgJIAUtICU');
  assert.equal(f.players[0].options.playerVars.autoplay, 0);
  assert.match(f.element('song-result').textContent, /<Song>.*Official artist/);
  f.players[0].options.events.onReady();
  f.players[0].options.events.onReady();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.requests.length, 2);
  assert.equal(
    new URL(f.requests[1].url).searchParams.get('q'),
    'G-Dragon A Song - Live',
  );
  assert.equal(f.requests[1].options.headers['X-Goog-Api-Key'], undefined);
});

test('missing configuration, API readiness, or artist/title does not issue a song request', async () => {
  const absent = fixture(undefined, '');
  absent.window.onYouTubeIframeAPIReady();
  await absent.song();
  assert.equal(absent.requests.length, 0);
  const f = fixture();
  await f.song();
  assert.equal(f.requests.length, 0);
  f.window.onYouTubeIframeAPIReady();
  for (const value of ['title only', ' - Title', 'Artist - ', 'a'.repeat(121)])
    await f.song(value);
  assert.equal(f.requests.length, 0);
});

test('failed or malformed song searches preserve the existing video and hide provider error details', async () => {
  for (const make of [
    () => response({ items: [] }),
    () => response({ items: [{ id: { videoId: 'invalid' }, snippet: {} }] }),
    () => new Response('secret fixture-key', { status: 403 }),
    () => {
      throw new Error('secret fixture-key');
    },
  ]) {
    const f = fixture(make);
    f.ready();
    const original = f.players[0];
    await f.song();
    assert.equal(original.destroyed, false);
    assert.equal(f.players.length, 1);
    assert.ok(f.element('song-status').textContent);
    assert.doesNotMatch(f.element('song-status').textContent, /fixture-key/);
  }
});

test('a direct link cancels an in-flight song search and rejects its stale completion', async () => {
  let complete;
  const f = fixture(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  f.ready();
  const search = f.song();
  assert.equal(f.requests.length, 1);
  f.submit('dQw4w9WgXcQ');
  complete(youtubeResponse());
  await search;
  assert.equal(f.players.length, 2);
  assert.equal(f.players[1].options.videoId, 'dQw4w9WgXcQ');
  assert.equal(f.requests[0].options.signal.aborted, true);
  assert.equal(f.element('song-result').textContent, '노래 연습');
});

test('an ignored manual lyric request does not lose the pending request before song handoff', async () => {
  let finishOld;
  const f = fixture((url) => {
    if (new URL(url).hostname === 'www.googleapis.com')
      return youtubeResponse();
    if (!finishOld)
      return new Promise((resolve) => {
        finishOld = resolve;
      });
    return response();
  });
  f.ready();
  const pending = f.search();
  await f.search();
  await f.song();
  f.players.at(-1).options.events.onReady();
  await new Promise((resolve) => setImmediate(resolve));
  finishOld(response());
  await pending;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(
    f.requests.filter((r) => new URL(r.url).hostname === 'lrclib.net').length,
    2,
  );
});

test('only the newest song search may replace the player', async () => {
  const completions = [];
  const f = fixture(() => new Promise((resolve) => completions.push(resolve)));
  f.ready();
  const old = f.song('Artist - Old');
  const latest = f.song('Artist - New');
  completions[1](youtubeResponse());
  await latest;
  completions[0](
    response({
      items: [
        {
          id: { videoId: 'dQw4w9WgXcQ' },
          snippet: { title: 'Old', channelTitle: 'Old' },
        },
      ],
    }),
  );
  await old;
  assert.equal(f.players.length, 2);
  assert.equal(f.players[1].options.videoId, '7HgJIAUtICU');
  assert.equal(f.requests[0].options.signal.aborted, true);
});

test('a newer search invalidates a previous video readiness lyric handoff', async () => {
  let count = 0;
  const f = fixture(() =>
    ++count === 1 ? youtubeResponse() : response({ items: [] }),
  );
  f.window.onYouTubeIframeAPIReady();
  await f.song();
  const previous = f.players[0];
  await f.song('Artist - Other');
  previous.options.events.onReady();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.requests.length, 2);
  assert.ok(
    f.requests.every((r) => new URL(r.url).hostname === 'www.googleapis.com'),
  );
});

test('song request timeout aborts and oversized responses cannot replace the video', async () => {
  const f = fixture(
    (_url, options) =>
      new Promise((_resolve, reject) =>
        options.signal.addEventListener('abort', () =>
          reject(new Error('aborted')),
        ),
      ),
  );
  f.ready();
  const pending = f.song();
  f.timeouts.at(-1)();
  await pending;
  assert.equal(f.requests[0].options.signal.aborted, true);
  assert.equal(f.element('song-search-button').disabled, false);
  assert.match(f.element('song-status').textContent, /시간이 초과/);
  const large = fixture(() => new Response('x'.repeat(4 * 1048576 + 1)));
  large.ready();
  await large.song();
  assert.equal(large.players.length, 1);
  assert.equal(large.players[0].destroyed, false);
});

test('song search observes provider retry delay without sending extra requests', async () => {
  const f = fixture(
    () => new Response('', { status: 429, headers: { 'Retry-After': '120' } }),
  );
  f.ready();
  await f.song();
  await f.song();
  assert.equal(f.requests.length, 1);
  f.advance(120000);
  await f.song();
  assert.equal(f.requests.length, 2);
});

test('unplayable searched video restores previous video and selected lyrics without autoplay', async () => {
  const f = fixture((url) =>
    url.includes('googleapis.com') ? youtubeResponse() : response(),
  );
  f.ready();
  await f.search();
  f.select();
  f.players[0].position = 6;
  f.element('lyrics-offset').value = '1';
  f.element('lyrics-offset').change();
  await f.song();
  const candidate = f.players.at(-1);
  candidate.options.events.onReady();
  candidate.options.events.onError({ data: 150 });
  const restored = f.players.at(-1);
  assert.notEqual(restored, candidate);
  assert.equal(restored.options.videoId, 'M7lc1UVf-VE');
  assert.equal(restored.options.playerVars.autoplay, 0);
  restored.options.events.onReady();
  assert.match(f.element('lyrics-source').textContent, /LRCLIB #42/);
  assert.equal(f.element('lyrics-offset').value, '1');
  assert.match(f.element('song-status').textContent, /이전 영상/);
  candidate.options.events.onReady();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.requests.filter((r) => r.url.includes('lrclib')).length, 1);
});

test('searched player readiness timeout restores once and ignores late candidate callbacks', async () => {
  const f = fixture(() => youtubeResponse());
  f.ready();
  await f.song();
  const candidate = f.players.at(-1);
  f.timeouts.at(-1)();
  assert.equal(f.players.length, 3);
  assert.equal(f.players.at(-1).options.videoId, 'M7lc1UVf-VE');
  candidate.options.events.onReady();
  candidate.options.events.onError({ data: 150 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.players.length, 3);
  assert.equal(f.requests.length, 1);
});

test('errors after successful playback do not revert a deliberately played video', async () => {
  const f = fixture(() => youtubeResponse());
  f.ready();
  await f.song();
  const candidate = f.players.at(-1);
  candidate.options.events.onStateChange({ data: 1 });
  candidate.options.events.onError({ data: 150 });
  assert.equal(f.players.length, 2);
  assert.match(f.element('status').textContent, /다른 영상/);
});

test('lyrics rank by video duration before limiting results, with stable ties and unknown lengths last', async () => {
  const records = [
    null,
    ...Array.from({ length: 21 }, (_, i) => ({
      ...record,
      id: i + 1,
      trackName: 'Far ' + i,
      duration: 300 + i,
    })),
    { ...record, id: 50, trackName: 'Closest', duration: 100 },
    { ...record, id: 51, trackName: 'Tie first', duration: 99 },
    { ...record, id: 52, trackName: 'Tie second', duration: 101 },
    { ...record, id: 53, trackName: 'Unknown', duration: null },
  ];
  const f = fixture(() => response(records));
  f.ready();
  await f.search();
  const names = f.element('lyrics-results').children.map((n) => n.textContent);
  assert.match(names[0], /^Closest/);
  assert.match(names[1], /^Tie first/);
  assert.match(names[2], /^Tie second/);
  assert.equal(names.length, 20);
  assert.equal(
    names.some((n) => n.startsWith('Unknown')),
    false,
  );
  assert.match(f.element('lyrics-ranking').textContent, /1:40/);
  assert.match(names[1], /1초 차이/);
  assert.equal(f.element('lyrics-source').textContent, '');
});

test('unknown video duration preserves provider order then sorts once metadata arrives without extra requests', async () => {
  const f = fixture(() =>
    response([
      { ...record, id: 1, trackName: 'Far', duration: 300 },
      { ...record, id: 2, trackName: 'Near', duration: 100 },
      { ...record, id: 3, trackName: 'Unknown', duration: 0 },
    ]),
  );
  f.ready();
  f.players[0].duration = 0;
  await f.search();
  assert.match(f.element('lyrics-results').children[0].textContent, /^Far/);
  f.players[0].duration = 100;
  f.tick();
  assert.match(f.element('lyrics-results').children[0].textContent, /^Near/);
  const first = f.element('lyrics-results').children[0];
  f.tick();
  assert.equal(f.element('lyrics-results').children[0], first);
  assert.equal(f.requests.length, 1);
  f.select();
  assert.match(f.element('lyrics-source').textContent, /LRCLIB #2/);
  f.submit('dQw4w9WgXcQ');
  f.tick();
  assert.equal(f.element('lyrics-ranking').textContent, '');
  assert.equal(f.element('lyrics-results').children.length, 0);
});

test('replacing a video collapses sync controls while invalid links preserve the current practice', () => {
  const f = fixture();
  f.ready();
  f.element('lyrics-sync').open = true;
  f.submit('invalid');
  assert.equal(f.element('lyrics-sync').open, true);
  f.submit('dQw4w9WgXcQ');
  assert.equal(f.element('lyrics-sync').open, false);
});

test('offset buttons adjust lyric timing without seeking and reset to the original timestamps', async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  f.players[0].position = 1.75;
  f.tick();
  assert.equal(f.currentLyric().textContent, '');
  f.element('lyrics-earlier').click();
  assert.equal(f.element('lyrics-offset').value, '-0.5');
  assert.equal(f.currentLyric().textContent, 'First');
  assert.match(f.element('lyrics-offset-value').textContent, /0.5초 일찍/);
  f.element('lyrics-later').click();
  f.element('lyrics-later').click();
  assert.equal(f.element('lyrics-offset').value, '0.5');
  assert.match(f.element('lyrics-offset-value').textContent, /0.5초 늦게/);
  assert.equal(f.players[0].seek, undefined);
  f.element('lyrics-reset').click();
  assert.equal(f.element('lyrics-offset').value, '0');
  assert.equal(f.element('lyrics-reset').disabled, true);
});

test('offset buttons clamp to limits and are unavailable for plain lyrics or replaced videos', async () => {
  const f = fixture(() =>
    response([record, { ...record, id: 43, syncedLyrics: null }]),
  );
  f.ready();
  await f.search();
  f.select();
  f.element('lyrics-offset').value = '599.9';
  f.element('lyrics-offset').change();
  f.element('lyrics-later').click();
  assert.equal(f.element('lyrics-offset').value, '600');
  assert.equal(f.element('lyrics-later').disabled, true);
  f.element('lyrics-offset').value = '-599.9';
  f.element('lyrics-offset').change();
  f.element('lyrics-earlier').click();
  assert.equal(f.element('lyrics-offset').value, '-600');
  assert.equal(f.element('lyrics-earlier').disabled, true);
  f.select(1);
  assert.equal(f.element('lyrics-earlier').disabled, true);
  assert.equal(f.element('lyrics-later').disabled, true);
  f.element('lyrics-later').click();
  assert.equal(f.element('lyrics-offset').value, '0');
  f.select(0);
  f.submit('dQw4w9WgXcQ');
  assert.equal(f.element('lyrics-later').disabled, true);
});

test('search and practice screens switch explicitly and hidden playback cannot resume', () => {
  const f = fixture();
  f.ready();
  const p = f.players[0];
  assert.equal(f.element('discovery-screen').hidden, true);
  assert.equal(f.element('practice-screen').hidden, false);
  f.element('find-another-song').click();
  assert.equal(f.element('discovery-screen').hidden, false);
  assert.equal(f.element('practice-screen').hidden, true);
  assert.ok(p.pauses > 0);
  const pauses = p.pauses;
  f.visibility(1);
  p.options.events.onStateChange({ data: 1 });
  assert.equal(p.pauses, pauses + 1);
  f.element('return-to-practice').click();
  assert.equal(f.element('practice-screen').hidden, false);
  assert.equal(p.pauses, pauses + 1);
  assert.equal(f.players.length, 1);
});

test('invalid direct links report an error on the search screen without switching screens', () => {
  const f = fixture();
  f.ready();
  f.element('find-another-song').click();
  f.submit('invalid');
  assert.equal(f.element('discovery-screen').hidden, false);
  assert.match(f.element('song-status').textContent, /올바른 YouTube/);
});

test('single-song repeat defaults on and can be toggled without autoplay or seeking', () => {
  const f = fixture();
  f.ready();
  const p = f.players[0];
  assert.equal(p.options.playerVars.loop, 1);
  assert.equal(p.options.playerVars.playlist, p.options.videoId);
  assert.equal(p.loop, true);
  assert.equal(p.options.playerVars.autoplay, 0);
  f.element('repeat-song').checked = false;
  f.element('repeat-song').change();
  assert.equal(p.loop, false);
  assert.equal(p.seek, undefined);
  f.submit('7HgJIAUtICU');
  assert.equal(f.players.at(-1).options.playerVars.loop, 0);
  assert.equal(f.players.at(-1).options.playerVars.playlist, '7HgJIAUtICU');
  f.players.at(-1).options.events.onReady();
  f.element('repeat-song').checked = true;
  f.element('repeat-song').change();
  assert.equal(f.players.at(-1).loop, true);
  f.window.singBridgePause();
  const paused = f.players.at(-1).pauses;
  f.players.at(-1).options.events.onStateChange({ data: 1 });
  assert.equal(f.players.at(-1).pauses, paused + 1);
});

test('refined playback duration updates ranking without changing a selected lyric', async () => {
  const f = fixture(() =>
    response([
      { ...record, id: 1, trackName: 'Initial', duration: 246 },
      { ...record, id: 2, trackName: 'Refined', duration: 245 },
    ]),
  );
  f.ready();
  f.players[0].duration = 246;
  await f.search();
  f.select();
  f.players[0].duration = 245.4;
  f.tick();
  assert.match(f.element('lyrics-results').children[0].textContent, /^Refined/);
  assert.match(f.element('lyrics-source').textContent, /LRCLIB #1/);
  const first = f.element('lyrics-results').children[0];
  f.players[0].duration = 245.39;
  f.tick();
  assert.equal(f.element('lyrics-results').children[0], first);
});

test('returning to existing practice cancels a pending song search and ignores its late result', async () => {
  let resolve;
  const f = fixture(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  f.ready();
  f.element('find-another-song').click();
  const pending = f.song();
  f.element('return-to-practice').click();
  assert.equal(f.requests[0].options.signal.aborted, true);
  resolve(youtubeResponse());
  await pending;
  assert.equal(f.players.length, 1);
  assert.equal(f.element('practice-screen').hidden, false);
});

test('lyrics panel pauses playback, blocks hidden playback and closes after selection without autoplay', async () => {
  const f = fixture(() => response());
  f.ready();
  const p = f.players[0];
  f.element('lyrics-panel-open').click();
  assert.equal(f.element('lyrics-panel').open, true);
  assert.ok(p.pauses > 0);
  const pauses = p.pauses;
  p.options.events.onStateChange({ data: 1 });
  assert.equal(p.pauses, pauses + 1);
  await f.search();
  f.select();
  assert.equal(f.element('lyrics-panel').open, false);
  assert.equal(p.seek, undefined);
  assert.equal(f.element('lyrics-placeholder').hidden, true);
  f.element('lyrics-panel-open').click();
  f.element('lyrics-panel-close').click();
  assert.equal(f.element('lyrics-panel').open, false);
});

test('changing videos clears the lyrics panel and shows an actionable empty state', async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  f.element('lyrics-panel-open').click();
  f.submit('7HgJIAUtICU');
  assert.equal(f.element('lyrics-panel').open, false);
  assert.equal(f.element('lyrics-placeholder').hidden, false);
});

test('failed or cancelled replacement searches preserve active video metadata', async () => {
  let replacement, resolve;
  const f = fixture((url) => {
    if (!url.includes('googleapis.com')) return response();
    if (replacement === 'fail') return new Response('', { status: 403 });
    if (replacement === 'pending')
      return new Promise((r) => {
        resolve = r;
      });
    return youtubeResponse();
  });
  f.ready();
  await f.song();
  f.players.at(-1).options.events.onReady();
  await new Promise((r) => setImmediate(r));
  const label = f.element('song-result').textContent;
  assert.match(label, /<Song>.*Official artist/);
  replacement = 'fail';
  f.element('find-another-song').click();
  await f.song('Another - Song');
  f.element('return-to-practice').click();
  assert.equal(f.element('song-result').textContent, label);
  replacement = 'pending';
  f.element('find-another-song').click();
  const pending = f.song('Another - Song');
  f.element('return-to-practice').click();
  resolve(youtubeResponse());
  await pending;
  assert.equal(f.element('song-result').textContent, label);
  f.element('lyrics-panel-open').click();
  assert.equal(f.element('video-details').textContent, label);
  f.element('lyrics-panel-close').click();
  f.submit();
  assert.equal(f.element('song-result').textContent, '노래 연습');
});

test("failed candidate playback restores the previous video's title and channel", async () => {
  let replacement = false;
  const f = fixture((url) => {
    if (!url.includes('googleapis.com')) return response();
    return replacement
      ? Response.json({
          items: [
            {
              id: { videoId: 'M7lc1UVf-VE' },
              snippet: { title: 'Unavailable', channelTitle: 'Other' },
            },
          ],
        })
      : youtubeResponse();
  });
  f.ready();
  await f.song();
  f.players.at(-1).options.events.onReady();
  f.players.at(-1).options.events.onStateChange({ data: 1 });
  await new Promise((r) => setImmediate(r));
  const label = f.element('song-result').textContent;
  replacement = true;
  await f.song('Another - Song');
  f.players.at(-1).options.events.onError({ data: 150 });
  f.players.at(-1).options.events.onReady();
  assert.equal(f.element('song-result').textContent, label);
});

test('chained loading candidates retain the last usable practice snapshot', async () => {
  const f = fixture((url) =>
    url.includes('googleapis.com') ? youtubeResponse() : response(),
  );
  f.ready();
  await f.search();
  f.select();
  f.players[0].position = 6;
  f.element('lyrics-offset').value = '1';
  f.element('lyrics-offset').change();
  await f.song();
  const first = f.players.at(-1);
  f.element('find-another-song').click();
  await f.song('Another - Candidate');
  const second = f.players.at(-1);
  second.options.events.onError({ data: 150 });
  const restored = f.players.at(-1);
  assert.equal(restored.options.videoId, 'M7lc1UVf-VE');
  restored.options.events.onReady();
  assert.match(f.element('lyrics-source').textContent, /LRCLIB #42/);
  assert.equal(f.element('lyrics-offset').value, '1');
  assert.equal(restored.options.playerVars.start, 6);
  const count = f.players.length;
  first.options.events.onError({ data: 150 });
  assert.equal(f.players.length, count);
});

test('background candidate restoration preserves discovery and a newer search', async () => {
  let hold = false,
    resolve;
  const f = fixture(() =>
    hold
      ? new Promise((r) => {
          resolve = r;
        })
      : youtubeResponse(),
  );
  f.ready();
  await f.song();
  const candidate = f.players.at(-1);
  f.element('find-another-song').click();
  hold = true;
  const pending = f.song('Another - Candidate');
  candidate.options.events.onError({ data: 150 });
  assert.equal(f.players.at(-1).options.videoId, 'M7lc1UVf-VE');
  assert.equal(f.element('practice-screen').hidden, true);
  assert.equal(f.element('discovery-screen').hidden, false);
  resolve(youtubeResponse());
  await pending;
  assert.equal(f.element('practice-screen').hidden, false);
  assert.equal(f.players.at(-1).options.videoId, '7HgJIAUtICU');
});

test('restoration after leaving a loading candidate does not reopen practice', async () => {
  const f = fixture(() => youtubeResponse());
  f.ready();
  await f.song();
  f.element('find-another-song').click();
  f.timeouts.at(-1)();
  assert.equal(f.players.at(-1).options.videoId, 'M7lc1UVf-VE');
  assert.equal(f.element('practice-screen').hidden, true);
  f.players.at(-1).options.events.onReady();
  assert.equal(f.element('discovery-screen').hidden, false);
});

test('new candidates during recovery loading retain the usable snapshot without recursive recovery', async () => {
  const f = fixture(() => youtubeResponse());
  f.ready();
  await f.song();
  f.players.at(-1).options.events.onError({ data: 150 });
  const recovery = f.players.at(-1);
  const count = f.players.length;
  recovery.options.events.onError({ data: 150 });
  assert.equal(f.players.length, count);
  await f.song('Another - Candidate');
  f.players.at(-1).options.events.onError({ data: 150 });
  assert.equal(f.players.at(-1).options.videoId, 'M7lc1UVf-VE');
});

test('timed rows keep identity and scroll only when the active timestamp changes', async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  const rows = [...f.element('lyrics-timing').children];
  assert.equal(rows.length, 3);
  const reading = f.element('lyric-window');
  f.players[0].position = 2;
  f.tick();
  assert.equal(f.currentLyric().textContent, 'First');
  const calls = reading.scrolls.length;
  f.tick();
  assert.equal(reading.scrolls.length, calls);
  f.players[0].position = 5;
  f.tick();
  assert.equal(f.currentLyric(), rows[1]);
  assert.deepEqual(f.element('lyrics-timing').children, rows);
  assert.equal(reading.scrolls.at(-1).behavior, 'smooth');
  assert.equal(reading.scrolls.length, calls + 1);
  assert.equal(f.players[0].seek, undefined);
});

test('manual lyric reading suspends tracking then catches up without a timestamp change', async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  const reading = f.element('lyric-window');
  reading.wheel();
  const calls = reading.scrolls.length;
  f.players[0].position = 2;
  f.tick();
  assert.equal(reading.scrolls.length, calls);
  f.advance(3999);
  f.tick();
  assert.equal(reading.scrolls.length, calls);
  f.advance(1);
  f.tick();
  assert.equal(reading.scrolls.length, calls + 1);
  reading.pointerdown();
  const heldCalls = reading.scrolls.length;
  f.advance(8000);
  f.tick();
  assert.equal(reading.scrolls.length, heldCalls);
  f.window.pointerup();
  f.advance(4000);
  f.tick();
  assert.equal(reading.scrolls.length, heldCalls + 1);
});

test('reduced motion uses immediate alignment and seek or repeat can move backwards', async () => {
  const f = fixture(() => response());
  f.window.reducedMotion = true;
  f.ready();
  await f.search();
  f.select();
  f.players[0].position = 5;
  f.tick();
  const reading = f.element('lyric-window');
  assert.equal(reading.scrolls.at(-1).behavior, 'instant');
  const secondTop = reading.scrollTop;
  f.players[0].position = 2;
  f.tick();
  assert.ok(reading.scrollTop < secondTop);
  assert.equal(f.currentLyric().textContent, 'First');
  f.players[0].position = 0;
  f.tick();
  assert.equal(f.currentLyric().textContent, '');
});

test('hidden practice and open settings defer tracking until practice is visible', async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  const reading = f.element('lyric-window');
  f.element('find-another-song').click();
  const calls = reading.scrolls.length;
  f.players[0].position = 2;
  f.tick();
  assert.equal(reading.scrolls.length, calls);
  f.element('return-to-practice').click();
  f.tick();
  assert.equal(reading.scrolls.length, calls + 1);
  f.element('lyrics-panel-open').click();
  f.players[0].position = 5;
  f.tick();
  assert.equal(reading.scrolls.length, calls + 1);
  f.element('lyrics-panel-close').click();
  f.tick();
  assert.equal(reading.scrolls.length, calls + 2);
});

test('script labels use displayed lyrics and preserve mixed writing systems', async () => {
  const f = fixture(() =>
    response([
      {
        ...record,
        plainLyrics: 'Only English',
        syncedLyrics:
          '[ar:English Artist]\n[00:02.00]안녕 Hello\n[00:05.00]踊る キミ écho',
      },
    ]),
  );
  f.ready();
  await f.search();
  const label = f.element('lyrics-results').children[0].textContent;
  assert.match(label, /한글/);
  assert.match(label, /라틴 문자/);
  assert.match(label, /일본어/);
  assert.doesNotMatch(label, /가나|한자|\d+%/);
  assert.match(label, /안녕 Hello/);
  assert.doesNotMatch(label, /English Artist|Only English|영어 가사/);
  f.select();
  assert.match(f.element('lyrics-scripts').textContent, /한글/);
});

test('script labels handle decomposed Hangul, halfwidth kana, accents and unknown letters', async () => {
  const f = fixture(() =>
    response([
      {
        ...record,
        syncedLyrics: '',
        plainLyrics: '한 ｶﾅ café Ж مرحبا अ ไทย א Ω ሀ 🎵 123',
      },
    ]),
  );
  f.ready();
  await f.search();
  const label = f.element('lyrics-results').children[0].textContent;
  for (const script of [
    '한글',
    '일본어',
    '라틴 문자',
    '키릴',
    '아랍',
    '데바나가리',
    '태국',
    '히브리',
    '그리스',
    '기타 문자',
  ])
    assert.ok(label.includes(script), script);
});

test('saved practice survives a new page and fetches the exact record with its signed offset', async () => {
  const storage = memoryStorage();
  const first = fixture(() => response(), 'fixture-key', storage);
  first.ready();
  await first.search();
  first.select();
  first.element('lyrics-offset').value = '-2.5';
  first.element('lyrics-offset').change();
  first.element('save-practice').click?.();
  assert.equal(storage.values.size, 1, 'save writes device storage');
  const raw = [...storage.values.values()][0];
  assert.doesNotMatch(raw, /syncedLyrics|plainLyrics|First|fixture-key/);
  const second = fixture(() => response(record), '', storage);
  assert.equal(second.element('saved-practices').children.length, 1);
  assert.equal(second.players.length, 0, 'no automatic playback on load');
  second.window.onYouTubeIframeAPIReady();
  second.visibility(1);
  second.element('saved-practices').children[0].children[0].click();
  second.players[0].options.events.onReady();
  await vm.runInContext('lyricFinished', second.context);
  assert.equal(new URL(second.requests[0].url).pathname, '/api/get/42');
  assert.equal(second.players[0].options.videoId, 'M7lc1UVf-VE');
  assert.equal(second.players[0].options.playerVars.autoplay, 0);
  assert.equal(second.element('lyrics-offset').value, '-2.5');
  second.players[0].position = 0;
  second.tick();
  assert.equal(second.currentLyric().textContent, 'First');
});

test('save updates only its video and lyric pair and removal persists', async () => {
  const storage = memoryStorage();
  const f = fixture(() => response(), 'fixture-key', storage);
  f.ready();
  await f.search();
  f.select();
  f.element('save-practice').click?.();
  f.element('lyrics-later').click();
  f.element('save-practice').click?.();
  assert.equal(f.element('saved-practices').children.length, 1);
  f.submit('dQw4w9WgXcQ');
  f.players.at(-1).options.events.onReady();
  await f.search();
  f.select();
  f.element('save-practice').click();
  assert.equal(f.element('saved-practices').children.length, 2);
  f.element('saved-practices').children[0].children[1].click();
  const next = fixture(undefined, '', storage);
  assert.equal(next.element('saved-practices').children.length, 1);
});

test('storage failure never reports success and cannot block normal lyrics', async () => {
  const storage = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('quota');
    },
  };
  const f = fixture(() => response(), 'fixture-key', storage);
  f.ready();
  await f.search();
  f.select();
  f.element('save-practice').click?.();
  assert.match(f.element('save-status').textContent, /저장하지 못/);
  f.players[0].position = 2;
  f.tick();
  assert.equal(f.currentLyric().textContent, 'First');
  assert.equal(f.element('saved-practices').children.length, 0);
});

async function savedFixture(makeResponse) {
  const storage = memoryStorage();
  const f = fixture(() => response(), 'fixture-key', storage);
  f.ready();
  await f.search();
  f.select();
  f.element('save-practice').click?.();
  assert.equal(storage.values.size, 1);
  const next = fixture(makeResponse, '', storage);
  next.window.onYouTubeIframeAPIReady();
  next.visibility(1);
  next.element('saved-practices').children[0].children[0].click();
  next.players[0].options.events.onReady();
  await Promise.resolve();
  return next;
}

test('missing or mismatched saved lyrics are not silently substituted', async () => {
  for (const make of [
    () => new Response('', { status: 404 }),
    () => response({ ...record, id: 43 }),
    () => response({ ...record, syncedLyrics: 'bad', plainLyrics: '' }),
  ]) {
    const f = await savedFixture(make);
    await vm.runInContext('lyricFinished', f.context);
    assert.equal(vm.runInContext('selectedLyricRecord', f.context), null);
    assert.equal(f.element('lyrics-offset').value, '0');
    assert.ok(f.element('lyrics-status').textContent.length > 0);
    assert.equal(f.element('saved-practices').children.length, 1);
  }
});

test('stale saved lyric response cannot replace a newer video selection', async () => {
  let resolve;
  const f = await savedFixture(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  f.submit('dQw4w9WgXcQ');
  f.players.at(-1).options.events.onReady();
  resolve(response(record));
  await vm.runInContext('lyricFinished', f.context);
  assert.equal(vm.runInContext('selectedLyricRecord', f.context), null);
  assert.equal(f.requests[0].options.signal.aborted, true);
});

test('a timing change after saving is kept and reported instead of retaining the save message', async () => {
  // Since #76 a practice saved after it was opened keeps timing changes at once.
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  f.element('save-practice').click();
  f.element('lyrics-later').click();
  assert.equal(f.element('save-status').textContent, '');
  assert.equal(f.element('sync-status').textContent, '싱크를 저장했어요.');
  assert.equal(f.element('save-practice').textContent, '저장됨');
});

test('kana prolonged marks do not create a spurious other-script label', async () => {
  const f = fixture(() =>
    response([{ ...record, syncedLyrics: '', plainLyrics: 'スーパー' }]),
  );
  f.ready();
  await f.search();
  assert.match(f.element('lyrics-results').children[0].textContent, /일본어/);
  assert.doesNotMatch(
    f.element('lyrics-results').children[0].textContent,
    /혼용|기타/,
  );
});

test('corrupt or future storage stays untouched and does not prevent normal practice', async () => {
  for (const raw of [
    '{bad',
    JSON.stringify({ version: 2, items: [] }),
    JSON.stringify({ version: 1, items: [{ videoId: 'bad' }] }),
  ]) {
    const storage = memoryStorage();
    storage.setItem('singbridge.practice.v1', raw);
    const f = fixture(() => response(), 'fixture-key', storage);
    assert.match(f.element('saved-status').textContent, /읽지 못/);
    f.ready();
    await f.search();
    f.select();
    f.element('save-practice').click();
    assert.equal(storage.getItem('singbridge.practice.v1'), raw);
    assert.match(f.element('save-status').textContent, /저장하지 못/);
  }
});

test('full saved library rejects new entries without eviction but permits updates', async () => {
  const storage = memoryStorage();
  const f = fixture(() => response(), 'fixture-key', storage);
  f.ready();
  await f.search();
  f.select();
  f.element('save-practice').click();
  const data = JSON.parse(storage.getItem('singbridge.practice.v1'));
  const base = data.items[0];
  data.items = Array.from({ length: 20 }, (_, i) => ({
    ...base,
    lyricId: 100 + i,
  }));
  storage.setItem('singbridge.practice.v1', JSON.stringify(data));
  const full = fixture(() => response(), 'fixture-key', storage);
  full.ready();
  await full.search();
  full.select();
  full.element('save-practice').click();
  assert.match(full.element('save-status').textContent, /20개/);
  assert.equal(
    JSON.parse(storage.getItem('singbridge.practice.v1')).items.length,
    20,
  );
  assert.equal(
    JSON.parse(storage.getItem('singbridge.practice.v1')).items[0].lyricId,
    100,
  );
  const update = fixture(
    () => response([{ ...record, id: 100 }]),
    'fixture-key',
    storage,
  );
  update.ready();
  await update.search();
  update.select();
  update.element('lyrics-later').click();
  update.element('save-practice').click();
  assert.equal(
    JSON.parse(storage.getItem('singbridge.practice.v1')).items.length,
    20,
  );
  assert.equal(
    JSON.parse(storage.getItem('singbridge.practice.v1')).items[0].offset,
    0.5,
  );
});

test('quota errors preserve the previously saved entry and removal failures remain visible', async () => {
  const storage = memoryStorage();
  const f = fixture(() => response(), 'fixture-key', storage);
  f.ready();
  await f.search();
  f.select();
  f.element('save-practice').click();
  const before = storage.getItem('singbridge.practice.v1');
  storage.setItem = () => {
    throw new Error('quota');
  };
  f.element('lyrics-later').click();
  f.element('save-practice').click();
  assert.equal(storage.getItem('singbridge.practice.v1'), before);
  assert.match(f.element('save-status').textContent, /저장하지 못/);
  f.element('saved-practices').children[0].children[1].click();
  assert.equal(f.element('saved-practices').children.length, 1);
  assert.match(f.element('saved-status').textContent, /삭제하지 못/);
});

test('saved restores honor retry backoff and never automatically retry', async () => {
  const f = await savedFixture(
    () => new Response('', { status: 429, headers: { 'Retry-After': '120' } }),
  );
  await vm.runInContext('lyricFinished', f.context);
  await f.search();
  assert.equal(f.requests.length, 1);
  assert.match(f.element('lyrics-status').textContent, /120초/);
  assert.equal(f.requests[0].options.signal.aborted, true);
});

test('Japanese display grouping does not label Han-only lyrics as Japanese', async () => {
  const f = fixture(() =>
    response([{ ...record, syncedLyrics: '', plainLyrics: '春天 Hello' }]),
  );
  f.ready();
  await f.search();
  const label = f.element('lyrics-results').children[0].textContent;
  assert.match(label, /한자/);
  assert.match(label, /라틴 문자/);
  assert.doesNotMatch(label, /일본어|\d+%/);
});

test('Japanese kana and Han collapse into one display label while Latin stays visible', async () => {
  const f = fixture(() =>
    response([
      {
        ...record,
        syncedLyrics: '[00:02.00]明日の青い空 Hello',
        plainLyrics: '',
      },
    ]),
  );
  f.ready();
  await f.search();
  f.select();
  assert.equal(
    f.element('lyrics-scripts').textContent,
    '표기: 일본어 · 라틴 문자',
  );
});

test('pronunciation validates exact source and rejects stale completion after reset', () => {
  const f = fixture();
  assert.equal(
    vm.runInContext("initialPronunciationTarget('ja-JP')", f.context),
    '',
  );
  assert.equal(
    vm.runInContext("initialPronunciationTarget('ko-KR')", f.context),
    'ko',
  );
  assert.equal(
    vm.runInContext("initialPronunciationTarget('en-US')", f.context),
    'en',
  );
  vm.runInContext(
    `
    const req = { target: 'ko', lines: [{ id: 'line-0', text: '오늘 Hello' }] };
    const good = { target: 'ko', lines: [{ id: 'line-0', segments: [
      {source:'오늘 ',language:'ko',reading:null,pronunciation:null,needsReview:false},
      {source:'Hello',language:'en',reading:null,pronunciation:'헬로',needsReview:false}
    ] }] };
    validatePronunciation(req, good);
  `,
    f.context,
  );
  assert.throws(() =>
    vm.runInContext(
      "good.lines[0].segments[0].source='변경'; validatePronunciation(req, good)",
      f.context,
    ),
  );
  vm.runInContext(
    "resetPronunciation(); window.singBridgePronunciationResult({id:'stale',result:good})",
    f.context,
  );
  assert.equal(vm.runInContext('pronunciationResults.size', f.context), 0);
});

test('pronunciation keeps row identity, timing, offset and same-language text through hide/show', async () => {
  const f = fixture(() =>
    response([
      { ...record, syncedLyrics: '[00:02.00]오늘 Hello\n[00:05.00]First' },
    ]),
  );
  f.ready();
  await f.search();
  f.select();
  vm.runInContext(
    "window.singBridgeConfigurePronunciation('ko-KR', true)",
    f.context,
  );
  const sent = [];
  f.context.window.webkit = {
    messageHandlers: {
      pronunciation: {
        postMessage(message) {
          sent.push(message);
        },
      },
    },
  };
  f.element('lyrics-later').click();
  const rows = [...f.element('lyrics-timing').children];
  const pending = f.element('pronunciation-generate').click();
  const message = sent[0];
  assert.equal(message.request.target, 'ko');
  const result = {
    target: 'ko',
    lines: message.request.lines.map((line) => ({
      id: line.id,
      segments: [
        {
          source: line.text,
          language: line.text.startsWith('오늘') ? 'ko' : 'en',
          reading: null,
          pronunciation: line.text.startsWith('오늘') ? null : '퍼스트',
          needsReview: false,
        },
      ],
    })),
  };
  f.context.window.singBridgePronunciationResult({ id: message.id, result });
  await pending;
  assert.equal(f.element('lyrics-timing').children[0], rows[0]);
  assert.equal(f.element('lyrics-offset').value, '0.5');
  assert.match(rows[1].textContent, /First퍼스트/);
  f.element('pronunciation-toggle').click();
  assert.equal(rows[1].textContent, 'First');
  f.element('pronunciation-toggle').click();
  assert.match(rows[1].textContent, /퍼스트/);
  assert.equal(vm.runInContext('lyricLines[1].time', f.context), 5);
});

test('target change cancels a pending conversion and ignores its late response', async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  vm.runInContext(
    "window.singBridgeConfigurePronunciation('ko', true)",
    f.context,
  );
  const sent = [];
  f.context.window.webkit = {
    messageHandlers: { pronunciation: { postMessage: (m) => sent.push(m) } },
  };
  const pending = f.element('pronunciation-generate').click();
  f.element('pronunciation-target').value = 'en';
  f.element('pronunciation-target').change();
  f.context.window.singBridgePronunciationResult({
    id: sent[0].id,
    result: {},
  });
  await pending;
  assert.ok(sent.some((m) => m.cancel));
  assert.equal(vm.runInContext('pronunciationResults.size', f.context), 0);
  assert.equal(f.element('pronunciation-generate').disabled, false);
  assert.equal(f.element('lyrics-timing').children[0].textContent, 'First');
});

test('pronunciation request IDs keep the bridge format and differ across page lifetimes', async () => {
  const ids = [];
  // Two page loads five seconds apart that repeat the same reset sequence.
  for (const start of [1700000000000, 1700000005000]) {
    const f = fixture(() => response(), undefined, undefined, start);
    f.ready();
    await f.search();
    f.select();
    vm.runInContext(
      "window.singBridgeConfigurePronunciation('ko', true)",
      f.context,
    );
    const sent = [];
    f.context.window.webkit = {
      messageHandlers: { pronunciation: { postMessage: (m) => sent.push(m) } },
    };
    f.element('pronunciation-generate').click();
    ids.push(sent[0].id);
  }
  for (const id of ids) {
    assert.match(id, /^[0-9]+-[0-9]+$/);
    assert.ok(id.length <= 40, id);
  }
  assert.notEqual(ids[0].split('-')[0], ids[1].split('-')[0]);
});

test('Android pronunciation port rejects a forged iframe port without its native nonce', () => {
  const f = fixture();
  let started = 0;
  f.context.window.message({
    data: 'fake',
    ports: [
      {
        start() {
          started++;
        },
      },
    ],
  });
  assert.equal(started, 0);
  f.context.window.singBridgePreparePronunciationPort('nonce');
  f.context.window.message({
    data: 'wrong',
    ports: [
      {
        start() {
          started++;
        },
      },
    ],
  });
  assert.equal(started, 0);
  f.context.window.message({
    data: 'nonce',
    ports: [
      {
        start() {
          started++;
        },
      },
    ],
  });
  assert.equal(started, 1);
});

test('replacing lyrics clears partial pronunciation and cancels the next batch', async () => {
  const large = {
    ...record,
    syncedLyrics: Array.from(
      { length: 13 },
      (_, i) => `[00:${String(i + 1).padStart(2, '0')}.00]Hello ${i}`,
    ).join('\n'),
  };
  const f = fixture(() => response([large, { ...record, id: 43 }]));
  f.ready();
  await f.search();
  f.select();
  vm.runInContext(
    "window.singBridgeConfigurePronunciation('ko', true)",
    f.context,
  );
  const sent = [];
  f.context.window.webkit = {
    messageHandlers: { pronunciation: { postMessage: (m) => sent.push(m) } },
  };
  const pending = f.element('pronunciation-generate').click();
  const complete = (m) => ({
    id: m.id,
    result: {
      target: 'ko',
      lines: m.request.lines.map((line) => ({
        id: line.id,
        segments: [
          {
            source: line.text,
            language: 'en',
            reading: null,
            pronunciation: '헬로',
            needsReview: false,
          },
        ],
      })),
    },
  });
  f.context.window.singBridgePronunciationResult(complete(sent[0]));
  await Promise.resolve();
  assert.equal(vm.runInContext('pronunciationResults.size', f.context), 12);
  assert.equal(sent.length, 2);
  f.select(1);
  f.context.window.singBridgePronunciationResult(complete(sent[1]));
  await pending;
  assert.ok(sent.some((m) => m.cancel));
  assert.equal(vm.runInContext('pronunciationResults.size', f.context), 0);
  assert.equal(vm.runInContext('selectedLyricRecord.id', f.context), 43);
  assert.equal(f.element('lyrics-timing').children[0].textContent, 'First');
  assert.equal(vm.runInContext('lyricLines[0].time', f.context), 2);
});

test('each pronunciation batch carries two read-only neighbor lines per side, skipping blank lines', async () => {
  const text = (i) => (i === 12 ? '' : `Hello ${i}`);
  const large = {
    ...record,
    syncedLyrics: Array.from(
      { length: 16 },
      (_, i) => `[00:${String(i + 1).padStart(2, '0')}.00]${text(i)}`,
    ).join('\n'),
  };
  const f = fixture(() => response([large]));
  f.ready();
  await f.search();
  f.select();
  vm.runInContext(
    "window.singBridgeConfigurePronunciation('ko', true)",
    f.context,
  );
  const sent = [];
  f.context.window.webkit = {
    messageHandlers: { pronunciation: { postMessage: (m) => sent.push(m) } },
  };
  const pending = f.element('pronunciation-generate').click();
  const complete = (m) => ({
    id: m.id,
    result: {
      target: 'ko',
      lines: m.request.lines.map((line) => ({
        id: line.id,
        segments: [
          {
            source: line.text,
            language: 'en',
            reading: null,
            pronunciation: '헬로',
            needsReview: false,
          },
        ],
      })),
    },
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(sent[0].request.lines.map((line) => line.id))),
    Array.from({ length: 12 }, (_, i) => `line-${i}`),
  );
  assert.deepEqual(JSON.parse(JSON.stringify(sent[0].request.context)), {
    before: [],
    after: ['Hello 13', 'Hello 14'],
  });
  f.context.window.singBridgePronunciationResult(complete(sent[0]));
  await Promise.resolve();
  assert.deepEqual(
    JSON.parse(JSON.stringify(sent[1].request.lines.map((line) => line.id))),
    ['line-13', 'line-14', 'line-15'],
  );
  assert.deepEqual(JSON.parse(JSON.stringify(sent[1].request.context)), {
    before: ['Hello 10', 'Hello 11'],
    after: [],
  });
  f.context.window.singBridgePronunciationResult(complete(sent[1]));
  await pending;
  assert.equal(vm.runInContext('pronunciationResults.size', f.context), 15);
});

test('video replacement disables pronunciation until new timed lyrics are selected', async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  vm.runInContext(
    "window.singBridgeConfigurePronunciation('ko', true)",
    f.context,
  );
  assert.equal(f.element('pronunciation-generate').disabled, false);
  f.submit('dQw4w9WgXcQ');
  assert.equal(f.element('pronunciation-generate').disabled, true);
});

// Issue #37: a flagged phrase keeps the model's pronunciation, and the row says why it needs review.
test('a review-flagged phrase shows its pronunciation with a visible review label and restores', async () => {
  const storage = memoryStorage();
  const first = await generatedPractice(storage, 'ja', { needsReview: true });
  const row = first.element('lyrics-timing').children[0];
  assert.match(row.textContent, /테스트 발음.*음차 확인 필요/);
  assert.ok(
    row.children.some((child) =>
      child.children?.some(
        (phrase) => phrase.className === 'pronunciation-review',
      ),
    ),
  );
  first.element('save-practice').click();
  const second = await reopenPronunciation(storage);
  assert.match(
    second.element('lyrics-timing').children[0].textContent,
    /테스트 발음.*음차 확인 필요/,
  );
});

test('a review-flagged phrase without pronunciation shows the source and the review label', async () => {
  const f = await generatedPractice(memoryStorage(), 'ja', {
    needsReview: true,
    pronunciation: null,
  });
  const row = f.element('lyrics-timing').children[0];
  assert.doesNotMatch(row.textContent, /테스트 발음/);
  assert.match(row.textContent, /음차 확인 필요/);
});

test('the pronunciation help says an underlined phrase may show a pronunciation to check', () => {
  const help = pronunciationHtml.match(
    /<p class="candidate-detail">([^<]*)<\/p>/,
  )[1];
  assert.match(help, /밑줄/);
  assert.match(help, /확인이 필요/);
  assert.doesNotMatch(help, /원문을 그대로 보여 줍니다/);
});

test('a review-flagged pronunciation cannot be blank', () => {
  const f = fixture();
  f.context.candidate = {
    target: 'ko',
    lines: [
      {
        id: 'line-0',
        segments: [
          {
            source: 'Hello',
            language: 'en',
            reading: null,
            pronunciation: '   ',
            needsReview: true,
          },
        ],
      },
    ],
  };
  assert.throws(() =>
    vm.runInContext(
      "validatePronunciation({target:'ko',lines:[{id:'line-0',text:'Hello'}]}, candidate)",
      f.context,
    ),
  );
});

test('confident foreign pronunciation cannot be missing or blank', () => {
  const f = fixture();
  for (const pronunciation of [null, '   ']) {
    f.context.candidate = {
      target: 'ko',
      lines: [
        {
          id: 'line-0',
          segments: [
            {
              source: 'Hello',
              language: 'en',
              reading: null,
              pronunciation,
              needsReview: false,
            },
          ],
        },
      ],
    };
    assert.throws(() =>
      vm.runInContext(
        "validatePronunciation({target:'ko',lines:[{id:'line-0',text:'Hello'}]}, candidate)",
        f.context,
      ),
    );
  }
});

async function generatedPractice(
  storage = memoryStorage(),
  language = 'en',
  fields = {},
) {
  const f = fixture(() => response(), 'fixture-key', storage);
  f.ready();
  await f.search();
  f.select();
  f.window.singBridgeConfigurePronunciation('ko', true);
  const sent = [];
  f.window.webkit = {
    messageHandlers: { pronunciation: { postMessage: (m) => sent.push(m) } },
  };
  const pending = f.element('pronunciation-generate').click();
  const message = sent[0];
  f.window.singBridgePronunciationResult({
    id: message.id,
    result: {
      target: 'ko',
      lines: message.request.lines.map((line) => ({
        id: line.id,
        segments: [
          {
            source: line.text,
            language,
            reading: null,
            pronunciation: '테스트 발음',
            needsReview: false,
            ...fields,
          },
        ],
      })),
    },
  });
  await pending;
  return f;
}

async function reopenPronunciation(storage, restoredRecord = record) {
  const f = fixture(() => response(restoredRecord), '', storage);
  f.window.singBridgeConfigurePronunciation('en', false);
  f.window.onYouTubeIframeAPIReady();
  f.visibility(1);
  f.element('saved-practices').children[0].children[0].click();
  f.players[0].options.events.onReady();
  await vm.runInContext('lyricFinished', f.context);
  return f;
}

test('Spanish pronunciation shows a visible experimental label and restores from a saved layer', async () => {
  const storage = memoryStorage();
  const first = await generatedPractice(storage, 'es');
  const row = first.element('lyrics-timing').children[0];
  // Touch WebViews show no title tooltip, so the label must be visible row text.
  assert.match(row.textContent, /테스트 발음.*스페인어\(실험\)/);
  assert.ok(
    row.children.some(
      (child) =>
        child.className === 'pronunciation-languages' &&
        child.textContent === '스페인어(실험)',
    ),
  );
  first.element('save-practice').click();
  const second = await reopenPronunciation(storage);
  assert.match(
    second.element('lyrics-timing').children[0].textContent,
    /테스트 발음.*스페인어\(실험\)/,
  );
});

test('rows without Spanish or with an edited line show no experimental label', async () => {
  const english = await generatedPractice(memoryStorage(), 'en');
  assert.doesNotMatch(
    english.element('lyrics-timing').children[0].textContent,
    /실험/,
  );
  const spanish = await generatedPractice(memoryStorage(), 'es');
  spanish.element('pronunciation-edit-line').value = 'line-0';
  spanish.element('pronunciation-edit-line').change();
  spanish.element('pronunciation-edit-text').value = '내가 고친 발음';
  spanish.element('pronunciation-edit-text').input();
  const row = spanish.element('lyrics-timing').children[0];
  assert.match(row.textContent, /직접 수정/);
  assert.doesNotMatch(row.textContent, /실험/);
});

test('automatic timing saves keep the stored layer, and only the practice save stores an edit', async () => {
  // Since #76 the practice save stores the layer; automatic timing saves never write pronunciation.
  const storage = memoryStorage();
  const f = await generatedPractice(storage);
  f.element('save-practice').click();
  const original = JSON.stringify(
    JSON.parse(storage.getItem('singbridge.practice.v1')).items[0]
      .pronunciations,
  );
  f.element('pronunciation-edit-line').value = 'line-0';
  f.element('pronunciation-edit-line').change();
  f.element('pronunciation-edit-text').value = 'Saved draft';
  f.element('pronunciation-edit-text').input();
  f.element('lyrics-later').click();
  let saved = JSON.parse(storage.getItem('singbridge.practice.v1')).items[0];
  assert.equal(saved.offset, 0.5);
  assert.equal(
    JSON.stringify(saved.pronunciations),
    original,
    'A timing save must retain the previously saved layer',
  );
  assert.equal(f.element('save-practice').disabled, false);
  f.element('save-practice').click();
  saved = JSON.parse(storage.getItem('singbridge.practice.v1')).items[0];
  assert.equal(saved.pronunciations.ko.edits['line-0'], 'Saved draft');
  const withEdit = JSON.stringify(saved.pronunciations);
  f.element('pronunciation-edit-text').value = 'one\ntwo';
  f.element('pronunciation-edit-text').input();
  assert.equal(
    f.element('save-practice').disabled,
    true,
    'An invalid edit is not a change to save',
  );
  f.element('lyrics-later').click();
  saved = JSON.parse(storage.getItem('singbridge.practice.v1')).items[0];
  assert.equal(saved.offset, 1);
  assert.equal(JSON.stringify(saved.pronunciations), withEdit);
});

test('saved pronunciation and line edits survive a new page without an AI bridge', async () => {
  const storage = memoryStorage();
  const first = await generatedPractice(storage);
  first.element('lyrics-offset').value = '5.5';
  first.element('lyrics-offset').change();
  first.element('pronunciation-edit-line').value = 'line-0';
  first.element('pronunciation-edit-line').change();
  first.element('pronunciation-edit-text').value = '내가 고친 발음';
  first.element('pronunciation-edit-text').input();
  first.element('save-practice').click();
  const second = await reopenPronunciation(storage);
  assert.equal(second.element('pronunciation-target').value, 'ko');
  assert.match(
    second.element('lyrics-timing').children[0].textContent,
    /내가 고친 발음.*직접 수정/,
  );
  assert.equal(second.element('lyrics-offset').value, '5.5');
  assert.equal(second.element('pronunciation-generate').disabled, true);
  assert.match(second.element('pronunciation-status').textContent, /불러왔/);
  second.element('lyrics-later').click();
  second.element('save-practice').click();
  const third = await reopenPronunciation(storage);
  assert.match(
    third.element('lyrics-timing').children[0].textContent,
    /내가 고친 발음/,
  );
  assert.equal(third.element('lyrics-offset').value, '6');
});

test('changed lyric text or timestamps cannot receive saved pronunciation', async () => {
  const storage = memoryStorage();
  const first = await generatedPractice(storage);
  first.element('save-practice').click();
  for (const syncedLyrics of [
    '[00:02.00]Changed',
    record.syncedLyrics.replace('00:02', '00:03'),
  ]) {
    const next = await reopenPronunciation(storage, {
      ...record,
      syncedLyrics,
    });
    assert.equal(vm.runInContext('pronunciationResults.size', next.context), 0);
    assert.match(next.element('pronunciation-status').textContent, /달라/);
  }
});

test('failed pronunciation save preserves stored result and keeps edits retryable', async () => {
  const storage = memoryStorage();
  const f = await generatedPractice(storage);
  f.element('save-practice').click();
  const before = storage.getItem('singbridge.practice.v1');
  f.element('pronunciation-edit-line').value = 'line-0';
  f.element('pronunciation-edit-line').change();
  f.element('pronunciation-edit-text').value = '<b>edited</b>';
  f.element('pronunciation-edit-text').input();
  storage.setItem = () => {
    throw new Error('Quota');
  };
  f.element('save-practice').click();
  assert.equal(storage.getItem('singbridge.practice.v1'), before);
  assert.match(f.element('save-status').textContent, /저장하지 못/);
  assert.match(
    f.element('lyrics-timing').children[0].textContent,
    /<b>edited<\/b>/,
  );
  assert.equal(f.element('save-practice').disabled, false);
  const next = await reopenPronunciation(storage);
  assert.doesNotMatch(
    next.element('lyrics-timing').children[0].textContent,
    /edited/,
  );
});

test('invalid edits cannot alter rendered lines, timing, or the save action', async () => {
  const f = await generatedPractice();
  f.element('save-practice').click();
  f.element('pronunciation-edit-line').value = 'line-0';
  f.element('pronunciation-edit-line').change();
  const times = vm.runInContext('JSON.stringify(lyricLines)', f.context);
  for (const invalid of [
    '',
    '   ',
    'one\ntwo',
    'one\rtwo',
    'one\u2028two',
    'one\u2029two',
    'one\u0000two',
    'one\u202Etwo',
    '가'.repeat(2001),
  ]) {
    f.element('pronunciation-edit-text').value = invalid;
    f.element('pronunciation-edit-text').input();
    assert.equal(
      f.element('save-practice').disabled,
      true,
      JSON.stringify(invalid.slice(0, 30)),
    );
    assert.equal(
      f.element('lyrics-timing').children[0].children[0].textContent,
      '테스트 발음',
    );
    assert.equal(
      vm.runInContext('JSON.stringify(lyricLines)', f.context),
      times,
    );
  }
  f.element('pronunciation-edit-text').value = '가'.repeat(2000);
  f.element('pronunciation-edit-text').input();
  assert.equal(f.element('save-practice').disabled, false);
  f.element('pronunciation-edit-reset').click();
  assert.equal(f.element('pronunciation-edit-text').value, '테스트 발음');
  assert.doesNotMatch(
    f.element('lyrics-timing').children[0].textContent,
    /직접 수정/,
  );
});

test('tampered stored edits and mappings cannot replace valid source or execute markup', async () => {
  const storage = memoryStorage();
  const f = await generatedPractice(storage);
  f.element('save-practice').click();
  const good = storage.getItem('singbridge.practice.v1');
  const changes = [
    (d) => {
      d.edits['line-0'] = 'one\ntwo';
    },
    (d) => {
      d.edits['line-99'] = 'wrong line';
    },
    (d) => {
      d.lines[0].segments[0].source = 'changed';
    },
    (d) => {
      d.lines.push(d.lines[0]);
    },
    (d) => {
      d.source[0].time = -1;
    },
    (d) => {
      d.target = 'xx';
    },
    (d) => {
      d.edits['line-0'] = '가'.repeat(2001);
    },
  ];
  for (const mutate of changes) {
    const data = JSON.parse(good);
    mutate(data.items[0].pronunciations.ko);
    const raw = JSON.stringify(data);
    storage.setItem('singbridge.practice.v1', raw);
    const next = fixture(() => response(), '', storage);
    assert.match(next.element('saved-status').textContent, /읽지 못/);
    assert.equal(
      storage.getItem('singbridge.practice.v1'),
      raw,
      'Never overwrite corrupted storage',
    );
    next.ready();
    await next.search();
    next.select();
    assert.equal(
      next.element('lyrics-timing').children[0].textContent,
      'First',
    );
  }
});

test('target switching restores the matching saved layer and keeps user edits separate', async () => {
  const storage = memoryStorage();
  const f = await generatedPractice(storage);
  f.element('save-practice').click();
  f.element('pronunciation-target').value = 'en';
  f.element('pronunciation-target').change();
  assert.equal(vm.runInContext('pronunciationResults.size', f.context), 0);
  f.element('pronunciation-target').value = 'ko';
  f.element('pronunciation-target').change();
  assert.match(
    f.element('lyrics-timing').children[0].textContent,
    /테스트 발음/,
  );
  f.element('pronunciation-edit-text').value = '첫째 줄 수정';
  f.element('pronunciation-edit-text').input();
  f.element('pronunciation-edit-line').value = 'line-1';
  f.element('pronunciation-edit-line').change();
  assert.equal(f.element('pronunciation-edit-text').value, '테스트 발음');
  f.element('pronunciation-edit-text').value = '둘째 줄 수정';
  f.element('pronunciation-edit-text').input();
  f.element('save-practice').click();
  const next = await reopenPronunciation(storage);
  assert.match(
    next.element('lyrics-timing').children[0].textContent,
    /첫째 줄 수정/,
  );
  assert.match(
    next.element('lyrics-timing').children[1].textContent,
    /둘째 줄 수정/,
  );
});

// The reading language is the user's choice, not the device language on every load (#74).
const targetKey = 'singbridge.pronunciation-target.v1';

test('a chosen reading language is kept across page loads instead of the device locale', () => {
  const storage = memoryStorage();
  const first = fixture(undefined, 'fixture-key', storage);
  first.window.singBridgeConfigurePronunciation('en-US', true);
  assert.equal(first.element('pronunciation-target').value, 'en');
  assert.equal(storage.getItem(targetKey), null);
  first.element('pronunciation-target').value = 'ko';
  first.element('pronunciation-target').change();
  assert.equal(storage.getItem(targetKey), 'ko');

  const second = fixture(undefined, 'fixture-key', storage);
  second.window.singBridgeConfigurePronunciation('en-US', true);
  assert.equal(second.element('pronunciation-target').value, 'ko');

  // Choosing no language clears the choice, so the device locale applies again.
  second.element('pronunciation-target').value = '';
  second.element('pronunciation-target').change();
  assert.equal(storage.getItem(targetKey), null);
  const third = fixture(undefined, 'fixture-key', storage);
  third.window.singBridgeConfigurePronunciation('en-US', true);
  assert.equal(third.element('pronunciation-target').value, 'en');
});

test('a missing or invalid stored reading language falls back to the device locale', () => {
  for (const stored of [null, 'fr', '', 'ko-KR', '{"target":"ko"}']) {
    const storage = memoryStorage();
    if (stored !== null) storage.setItem(targetKey, stored);
    const f = fixture(undefined, 'fixture-key', storage);
    f.window.singBridgeConfigurePronunciation('en-US', true);
    assert.equal(f.element('pronunciation-target').value, 'en', String(stored));
  }
});

test('a saved practice still opens in its own reading language and keeps the stored choice', async () => {
  const storage = memoryStorage();
  const first = await generatedPractice(storage);
  first.element('save-practice').click();
  storage.setItem(targetKey, 'en');
  const second = await reopenPronunciation(storage);
  assert.equal(second.element('pronunciation-target').value, 'ko');
  assert.equal(storage.getItem(targetKey), 'en');
});

test('unavailable storage does not break the reading language choice', () => {
  const broken = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('QuotaExceededError');
    },
    removeItem() {
      throw new Error('SecurityError');
    },
  };
  const f = fixture(undefined, 'fixture-key', broken);
  f.window.singBridgeConfigurePronunciation('ko-KR', true);
  assert.equal(f.element('pronunciation-target').value, 'ko');
  f.element('pronunciation-target').value = 'en';
  f.element('pronunciation-target').change();
  assert.equal(f.element('pronunciation-target').value, 'en');
  f.element('pronunciation-target').value = '';
  f.element('pronunciation-target').change();
});

test('timestamp-like and markup-like edits stay literal and never enter the LRC parser', async () => {
  const storage = memoryStorage();
  const f = await generatedPractice(storage);
  const original = vm.runInContext('JSON.stringify(lyricLines)', f.context);
  f.element('pronunciation-edit-text').value =
    '[99:59.99]<script>wrong()</script>';
  f.element('pronunciation-edit-text').input();
  f.element('save-practice').click();
  const next = await reopenPronunciation(storage);
  assert.equal(
    vm.runInContext('JSON.stringify(lyricLines)', next.context),
    original,
  );
  assert.equal(
    next.element('lyrics-timing').children.length,
    f.element('lyrics-timing').children.length,
  );
  assert.equal(
    next.element('lyrics-timing').children[0].children[0].textContent,
    '[99:59.99]<script>wrong()</script>',
  );
});

test('lyric activation seeks with the signed offset and starts playback without changing lyrics', async () => {
  const f = await generatedPractice();
  const p = f.players[0];
  const source = vm.runInContext('JSON.stringify(lyricLines)', f.context);
  const row = f.element('lyrics-timing').children[0];
  assert.equal(row.tagName, 'BUTTON');
  for (const [offset, expected] of [
    [0, 2],
    [5.5, 7.5],
    [-1, 1],
    [-5, 0],
  ]) {
    f.element('lyrics-offset').value = String(offset);
    f.element('lyrics-offset').change();
    const plays = p.plays || 0;
    row.click?.({ detail: 0 });
    assert.deepEqual(p.seek, [expected, true]);
    assert.equal(p.plays, plays + 1);
    assert.equal(f.element('lyrics-offset').value, String(offset));
    assert.equal(
      vm.runInContext('JSON.stringify(lyricLines)', f.context),
      source,
    );
  }
  f.element('pronunciation-toggle').click();
  f.element('pronunciation-toggle').click();
  row.click({ detail: 0 });
  assert.match(row.textContent, /테스트 발음/);
  assert.deepEqual(p.seek, [0, true]);
});

test('lyric activation rejects hidden, unready, invalid-duration and out-of-range playback', async () => {
  const cases = [
    (f) => f.visibility(0),
    (f) => {
      f.document.hidden = true;
    },
    (f) => vm.runInContext('foreground = false', f.context),
    (f) => {
      f.element('practice-screen').hidden = true;
    },
    (f) => {
      f.element('lyrics-panel').open = true;
    },
    (f) => vm.runInContext('ready = false', f.context),
    (f) => {
      f.players[0].duration = NaN;
    },
    (f) => {
      f.players[0].duration = 0;
    },
    (f) => {
      f.players[0].duration = 2;
    },
    (f) => {
      f.element('lyrics-offset').value = '100';
      f.element('lyrics-offset').change();
    },
  ];
  for (const disable of cases) {
    const f = fixture(() => response());
    f.ready();
    await f.search();
    f.select();
    const row = f.element('lyrics-timing').children[0];
    disable(f);
    row.click?.({ detail: 0 });
    assert.equal(f.players[0].seek, undefined);
    assert.equal(f.players[0].plays, undefined);
  }
});

test('lyric drag, scrolling, and pointer cancellation cannot seek but the next tap can', async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  const reading = f.element('lyric-window'),
    row = f.element('lyrics-timing').children[0],
    p = f.players[0];
  const down = { pointerId: 1, clientX: 40, clientY: 40 };
  for (const gesture of [
    () => f.window.pointermove?.({ ...down, clientY: 60 }),
    () => {
      reading.scrollTop += 20;
      reading.scroll?.();
    },
    () => f.window.pointercancel(down),
  ]) {
    reading.pointerdown(down);
    gesture();
    f.window.pointerup(down);
    row.click?.({ detail: 1 });
    assert.equal(p.seek, undefined);
  }
  reading.pointerdown(down);
  f.window.pointerup(down);
  row.click?.({ detail: 1 });
  assert.deepEqual(p.seek, [2, true]);
  assert.equal(p.plays, 1);
  f.tick();
  assert.equal(f.currentLyric(), row);
});

test('blank markers and obsolete lyric rows never seek', async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  const [row, , blank] = f.element('lyrics-timing').children;
  assert.notEqual(blank.tagName, 'BUTTON');
  blank.click?.({ detail: 0 });
  vm.runInContext('renderTimedLyrics()', f.context);
  row.click?.({ detail: 0 });
  assert.equal(f.players[0].seek, undefined);
  f.element('lyrics-timing').children[0].click?.({ detail: 0 });
  assert.deepEqual(f.players[0].seek, [2, true]);
});

test('lyric seek following waits for the real player position', async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  const p = f.players[0];
  p.position = 2;
  f.tick();
  const first = f.currentLyric();
  p.seekTo = function (value, ahead) {
    this.seek = [value, ahead];
  };
  f.element('lyrics-timing').children[1].click?.({ detail: 0 });
  assert.deepEqual(p.seek, [5, true]);
  f.tick();
  assert.equal(f.currentLyric(), first);
  p.position = 5;
  f.tick();
  assert.equal(f.currentLyric().textContent, 'Second');
});

test('an album-title search suggests searching by song title and keeps the candidates', async () => {
  const f = fixture(() =>
    response([
      {
        ...record,
        id: 1,
        trackName: 'BAD BUNNY - TURiSTA (Visualizer)',
        artistName: 'Bad Bunny',
      },
      {
        ...record,
        id: 2,
        trackName: 'BAD BUNNY - DtMF (Visualizer)',
        artistName: 'Bad Bunny',
      },
      // A short title must not match inside unrelated words.
      { ...record, id: 3, trackName: 'I', artistName: 'Someone' },
      // A collaborator artist field still marks the prefix as the artist.
      {
        ...record,
        id: 4,
        trackName: 'BAD BUNNY - TURiSTA',
        artistName: 'Bad Bunny & Feid',
      },
    ]),
  );
  f.ready();
  await f.search('BAD BUNNY DeBÍ TiRAR MáS FOToS');
  assert.equal(f.element('lyrics-results').children.length, 4);
  assert.match(f.element('lyrics-status').textContent, /노래 제목으로/);
});

test('a candidate title found in the query does not trigger the song-title hint', async () => {
  for (const [trackName, artistName, query] of [
    ['踊り子 - odoriko', 'Vaundy', 'Vaundy 踊り子'],
    ['YOASOBI 夜に駆ける(inst)', 'YOASOBI', 'YOASOBI 夜に駆ける'],
    ['ＰＲＥＴＥＮＤＥＲ', 'Official髭男dism', 'Official髭男dism pretender'],
    ['DtMF', 'Bad Bunny', 'Bad Bunny - DtMF'],
    [
      'Escape (The Piña Colada Song)',
      'Rupert Holmes',
      'Rupert Holmes Piña Colada Song',
    ],
    ['白日', 'King Gnu', 'King Gnu 白日'],
    // A title made of letters from the artist name is still a title.
    ['i', 'Kendrick Lamar', 'Kendrick Lamar i'],
    // Users often omit diacritics.
    [
      'Escape (The Piña Colada Song)',
      'Rupert Holmes',
      'Rupert Holmes Pina Colada Song',
    ],
    ['Kendrick Lamar - i', 'Kendrick Lamar', 'Kendrick Lamar i'],
  ]) {
    const f = fixture(() =>
      response([{ ...record, id: 1, trackName, artistName }]),
    );
    f.ready();
    await f.search(query);
    assert.doesNotMatch(
      f.element('lyrics-status').textContent,
      /노래 제목으로/,
      query,
    );
    assert.match(f.element('lyrics-status').textContent, /같은 곡·버전/, query);
  }
});

test('an exact short artist prefix does not count as the song title', async () => {
  const f = fixture(() =>
    response([{ ...record, id: 1, trackName: 'U2 - One', artistName: 'U2' }]),
  );
  f.ready();
  await f.search('U2 Achtung Baby');
  assert.match(f.element('lyrics-status').textContent, /노래 제목으로/);
});

// Issue #33: one test per edge case of the substring matching from PR #32.
for (const [label, trackName, artistName, query, hint] of [
  [
    'a longer Latin title is a whole word',
    'Love',
    'Taylor Swift',
    'Taylor Swift Lover',
    true,
  ],
  [
    'a presentation suffix is not an alias',
    'Song (Visualizer)',
    'Artist',
    'Artist Visualizer',
    true,
  ],
  [
    'punctuation separates a short title',
    'I',
    'Kendrick Lamar',
    'Kendrick Lamar-I',
    false,
  ],
  [
    'a title equal to the artist needs its own occurrence',
    'Bad Company',
    'Bad Company',
    'Bad Company Straight Shooter',
    true,
  ],
  [
    'width is normalized before the leading article',
    'Ｔｈｅ Song',
    'Artist',
    'Artist Song',
    false,
  ],
  ['kana voicing marks are kept', 'がらす', 'Artist', 'Artist からす', true],
  ['Devanagari vowel signs are kept', 'कोई', 'Artist', 'Artist कई', true],
  // PR #35 review round 1.
  [
    'an emoji variation selector is not part of the title',
    'Love ❤️',
    'Artist',
    'Artist Love',
    false,
  ],
  [
    'a qualified MV label is not an alias',
    'Song (Official MV)',
    'Artist',
    'Artist Official MV',
    true,
  ],
  [
    'a qualified lyrics label is not an alias',
    'Song (Official Lyrics)',
    'Artist',
    'Artist Official Lyrics',
    true,
  ],
  [
    'an artist-titled song with an article needs its own occurrence',
    'A Perfect Circle',
    'A Perfect Circle',
    'A Perfect Circle Mer de Noms',
    true,
  ],
  // PR #35 review round 2.
  [
    'the whole artist name is removed before the title is retested',
    'The The',
    'The The',
    'The The Soul Mining',
    true,
  ],
  [
    'an artist name searched without its article is still removed',
    'A Perfect Circle',
    'A Perfect Circle',
    'Perfect Circle Mer de Noms',
    true,
  ],
]) {
  test(`song-title hint: ${label}`, async () => {
    const f = fixture(() =>
      response([{ ...record, id: 1, trackName, artistName }]),
    );
    f.ready();
    await f.search(query);
    const status = f.element('lyrics-status').textContent;
    if (hint) assert.match(status, /노래 제목으로/);
    else assert.match(status, /같은 곡·버전/);
  });
}

test('song-title hint: only the displayed candidates count, and a refined duration recomputes it', async () => {
  const f = fixture(() =>
    response([
      { ...record, id: 1, trackName: 'Target', duration: 300 },
      ...Array.from({ length: 20 }, (_, index) => ({
        ...record,
        id: index + 2,
        trackName: `Other ${index + 2}`,
        duration: 100,
      })),
    ]),
  );
  f.ready();
  f.players[0].duration = 100;
  await f.search('SingBridge Target');
  assert.equal(f.element('lyrics-results').children.length, 20);
  assert.match(f.element('lyrics-status').textContent, /노래 제목으로/);
  f.players[0].duration = 300;
  f.tick();
  assert.match(f.element('lyrics-results').children[0].textContent, /^Target/);
  assert.match(f.element('lyrics-status').textContent, /같은 곡·버전/);
});

test('token matching keeps titles that differ only in punctuation or spacing', async () => {
  for (const [trackName, artistName, query] of [
    ["Don't Stop Me Now", 'Queen', 'Queen dont stop me now'],
    ['A.D.H.D', 'Kendrick Lamar', 'Kendrick Lamar ADHD'],
    [
      'Mr. Blue Sky',
      'Electric Light Orchestra',
      'Electric Light Orchestra Mr Blue Sky',
    ],
    ['Bad Company', 'Bad Company', 'Bad Company Bad Company'],
    ['Song (Official Video)', 'Artist', 'Artist Song'],
  ]) {
    const f = fixture(() =>
      response([{ ...record, id: 1, trackName, artistName }]),
    );
    f.ready();
    await f.search(query);
    assert.match(f.element('lyrics-status').textContent, /같은 곡·버전/, query);
  }
});

test('a selected lyric keeps its status when a refined duration re-ranks the candidates', async () => {
  const f = fixture(() =>
    response([
      { ...record, id: 1, trackName: 'Initial', duration: 246 },
      { ...record, id: 2, trackName: 'Refined', duration: 245 },
    ]),
  );
  f.ready();
  f.players[0].duration = 246;
  await f.search();
  f.select();
  const status = f.element('lyrics-status').textContent;
  f.players[0].duration = 245.4;
  f.tick();
  assert.equal(f.element('lyrics-status').textContent, status);
});

// UI review of 2026-09-29: docs/notes/2026-09-29-ui-review.md.
test('the lyric panel follows the task order: status, search, results, 음차, save', () => {
  const at = (needle, from = 0) => {
    const index = lyricsHtml.indexOf(needle, from);
    assert.notEqual(index, -1, needle);
    return index;
  };
  assert.ok(at('id="lyrics-status"') < at('id="lyrics-search"'));
  assert.ok(at('id="lyrics-search"') < at('id="lyrics-results"'));
  assert.ok(at('id="lyrics-results"') < at('__PRONUNCIATION__'));
  assert.ok(at('__PRONUNCIATION__') < at('id="save-practice"'));
  // The search section collapses after a lyric is chosen, so the status stays outside it.
  const start = at('<details id="lyrics-settings"');
  const settings = lyricsHtml.slice(start, at('</details>', start));
  assert.doesNotMatch(settings, /id="lyrics-status"/);
});

test('lyric rows are dimmed by color, not opacity, and row labels are at least 0.75rem', () => {
  const rule = (selector) =>
    html.match(
      new RegExp(selector.replace(/[.]/g, '\\.') + '\\s*\\{([^}]*)\\}'),
    )[1];
  assert.doesNotMatch(rule('.lyric-row'), /opacity/);
  assert.doesNotMatch(rule('.lyric-row.is-current'), /opacity/);
  const size = rule('.pronunciation-languages').match(
    /font-size:\s*([\d.]+)rem/,
  )[1];
  assert.ok(Number(size) >= 0.75, size);
});

test('the page root font follows iOS Dynamic Type where WebKit supports it', () => {
  assert.match(
    html,
    /@supports \(font: -apple-system-body\) \{\s*html \{ font: -apple-system-body; \}/,
  );
  assert.doesNotMatch(html, /body \{[^}]*font: 16px/);
});

test('user-facing strings call the feature 음차 and keep 발음 only for the sung sound', () => {
  const text = pronunciationHtml
    .replace('노래에서 부르는 발음과', '')
    .replace('구절 언어와 발음을', '');
  assert.doesNotMatch(text, /발음/);
});

test('opening a video link is a secondary action beside the primary song search', () => {
  assert.match(
    html,
    /<form id="open">[\s\S]*?<button type="submit">영상 열기<\/button>/,
  );
  assert.match(searchHtml, /class="button-primary" type="submit">노래 검색/);
});

test('saving a reopened practice does not report its saved 음차 as unsaved', async () => {
  const storage = memoryStorage();
  const first = await generatedPractice(storage);
  first.element('save-practice').click();
  const f = await reopenPronunciation(storage);
  assert.match(
    f.element('lyrics-timing').children[0].textContent,
    /테스트 발음/,
  );
  f.element('lyrics-offset').value = '2';
  f.element('lyrics-offset').change();
  f.element('save-practice').click();
  assert.match(f.element('save-status').textContent, /저장했어요/);
  assert.doesNotMatch(f.element('save-status').textContent, /음차 저장/);
});

test('saving the practice says 음차 was not saved while a 음차 edit is invalid', async () => {
  const f = await generatedPractice(memoryStorage());
  f.element('pronunciation-edit-line').value = 'line-0';
  f.element('pronunciation-edit-line').change();
  f.element('pronunciation-edit-text').value = 'one\ntwo';
  f.element('pronunciation-edit-text').input();
  assert.equal(f.element('save-practice').disabled, false);
  f.element('save-practice').click();
  assert.match(f.element('save-status').textContent, /싱크를 저장했어요/);
  assert.match(
    f.element('save-status').textContent,
    /음차는 저장하지 않았어요/,
  );
});

test('saving the practice says when its generated 음차 was saved with it', async () => {
  const f = await generatedPractice(memoryStorage());
  f.element('save-practice').click();
  assert.match(
    f.element('save-status').textContent,
    /싱크와 음차를 저장했어요/,
  );
  assert.doesNotMatch(f.element('save-status').textContent, /음차 저장을/);
});

test('taps on controls never start a text selection, while lyrics and form fields stay selectable', () => {
  const rule = (selector) => {
    const match = html.match(
      new RegExp(
        `(?:^|\\n)\\s*${selector.replace(/[.#]/g, '\\$&')}\\s*\\{([^}]*)\\}`,
      ),
    );
    assert.ok(match, selector);
    return match[1];
  };
  const body = rule('body');
  assert.match(body, /-webkit-user-select:\s*none/);
  assert.match(body, /user-select:\s*none/);
  assert.match(body, /-webkit-touch-callout:\s*none/);
  const selectable = html.match(
    /\n\s*([^{}\n]+)\{[^}]*-webkit-user-select:\s*text[^}]*\}/,
  );
  assert.ok(selectable, 'a rule re-enables text selection');
  const selectors = selectable[1].split(',').map((part) => part.trim());
  for (const selector of [
    '#lyric-window',
    '#pronunciation-edit-source',
    'input',
    'textarea',
  ]) {
    assert.ok(selectors.includes(selector), selector);
  }
});

// Practice sharing by code: docs/specs/2026-09-30-practice-sharing.md (#65).
const sharedCode = 'singbridge:1:M7lc1UVf-VE:42:1250';
const sharedMessage = `${sharedCode}\nSingBridge 연습: Someone else\nhttps://youtu.be/M7lc1UVf-VE`;
const sharedRespond = (url) =>
  url.includes('/api/get/') ? response(record) : response();

function sharedReceiver(respond = sharedRespond, storage = memoryStorage()) {
  const f = fixture(respond, 'fixture-key', storage);
  f.window.onYouTubeIframeAPIReady();
  f.visibility(1);
  return f;
}

async function openShared(f, text) {
  f.submit(text);
  f.players.at(-1).options.events.onReady();
  await vm.runInContext('lyricFinished', f.context);
}

async function sharingSender(records = [record]) {
  const f = fixture(() => response(records));
  f.ready();
  await f.search();
  f.select();
  return f;
}

function shareBridge(f) {
  const sent = [];
  f.window.webkit = {
    messageHandlers: { share: { postMessage: (m) => sent.push(m) } },
  };
  f.tick();
  return sent;
}

test('a pasted share code opens the video, fetches that lyric record, and applies the offset after lyrics load', async () => {
  const storage = memoryStorage();
  const f = sharedReceiver(sharedRespond, storage);
  f.submit(sharedMessage);
  assert.equal(f.players.length, 1);
  assert.equal(f.players[0].options.videoId, 'M7lc1UVf-VE');
  assert.equal(f.players[0].options.playerVars.autoplay, 0);
  assert.equal(f.requests.length, 0);
  f.players[0].options.events.onReady();
  await vm.runInContext('lyricFinished', f.context);
  assert.deepEqual(
    f.requests.map((r) => new URL(r.url).pathname),
    ['/api/get/42'],
  );
  assert.equal(vm.runInContext('lyricAdjustment', f.context), 1.25);
  // The title comes from the fetched record, never from the pasted message.
  assert.equal(
    f.element('song-result').textContent,
    'SingBridge - Original <song>',
  );
  assert.match(
    f.element('save-status').textContent,
    /공유받은 연습을 열었어요/,
  );
  assert.equal(storage.getItem('singbridge.practice.v1'), null);
  // The existing save button then stores the fetched record's title and the shared offset.
  f.element('save-practice').click();
  const saved = JSON.parse(storage.getItem('singbridge.practice.v1')).items[0];
  assert.equal(saved.videoId, 'M7lc1UVf-VE');
  assert.equal(saved.lyricId, 42);
  assert.equal(saved.title, 'SingBridge - Original <song>');
  assert.equal(saved.offset, 1.25);
});

test('a track name that already starts with the artist is not prefixed again', async () => {
  // LRCLIB 35549827 is stored this way: artistName Novelbright, trackName "Novelbright - Walking with you".
  const prefixed = {
    ...record,
    artistName: 'Novelbright',
    trackName: 'Novelbright - Walking with you',
  };
  const storage = memoryStorage();
  const receiver = sharedReceiver(
    (url) => (url.includes('/api/get/') ? response(prefixed) : response()),
    storage,
  );
  await openShared(receiver, sharedMessage);
  assert.equal(
    receiver.element('song-result').textContent,
    'Novelbright - Walking with you',
  );
  receiver.element('save-practice').click();
  assert.equal(
    JSON.parse(storage.getItem('singbridge.practice.v1')).items[0].title,
    'Novelbright - Walking with you',
  );

  const sender = await sharingSender([prefixed]);
  const sent = shareBridge(sender);
  sender.element('share-practice').click();
  assert.equal(
    sent[0].split('\n')[1],
    'SingBridge 연습: Novelbright - Walking with you',
  );

  // An artist that only begins a word of the track name is still added.
  const partial = await sharingSender([
    { ...record, artistName: 'U2', trackName: 'U2gether' },
  ]);
  const partialSent = shareBridge(partial);
  partial.element('share-practice').click();
  assert.equal(partialSent[0].split('\n')[1], 'SingBridge 연습: U2 - U2gether');
});

test('a share code is found when a messenger or the input joins the lines', async () => {
  for (const text of [
    sharedMessage.replaceAll('\n', ''),
    sharedMessage.replaceAll('\n', ' '),
    `받은 메시지 ${sharedMessage} 끝`,
    `${sharedCode}\n${sharedCode}`,
  ]) {
    const f = sharedReceiver();
    await openShared(f, text);
    assert.equal(f.players[0].options.videoId, 'M7lc1UVf-VE', text);
    assert.equal(vm.runInContext('lyricAdjustment', f.context), 1.25, text);
  }
});

test('invalid or conflicting share codes are rejected without a player or a network request', () => {
  for (const text of [
    'singbridge:1:M7lc1UVf-V:42:0',
    'singbridge:1:M7lc1UVf-VEx:42:0',
    'singbridge:1:M7lc1UVf!VE:42:0',
    'singbridge:1:M7lc1UVf-VE:0:0',
    'singbridge:1:M7lc1UVf-VE:042:0',
    'singbridge:1:M7lc1UVf-VE:9007199254740993:0',
    'singbridge:1:M7lc1UVf-VE:42:600001',
    'singbridge:1:M7lc1UVf-VE:42:-600001',
    'singbridge:1:M7lc1UVf-VE:42:1.5',
    'singbridge:1:M7lc1UVf-VE:42:',
    'singbridge:2:M7lc1UVf-VE:42:0',
    'singbridge:1:M7lc1UVf-VE:42:0 singbridge:1:M7lc1UVf-VE:43:0',
    'https://youtu.be/M7lc1UVf-VE singbridge:x',
  ]) {
    const f = sharedReceiver();
    f.submit(text);
    assert.equal(f.players.length, 0, text);
    assert.equal(f.requests.length, 0, text);
    assert.match(
      f.element('song-status').textContent,
      /공유 코드를 읽지 못했어요/,
      text,
    );
  }
});

test('an invalid share code is reported before waiting for the YouTube API', () => {
  const f = fixture();
  f.submit('singbridge:1:short:42:0');
  assert.match(
    f.element('song-status').textContent,
    /공유 코드를 읽지 못했어요/,
  );
});

test('input without a share code keeps opening YouTube links and IDs', () => {
  const f = sharedReceiver();
  f.submit('https://youtu.be/M7lc1UVf-VE');
  assert.equal(f.players.length, 1);
  f.submit('not a link');
  assert.match(
    f.element('song-status').textContent,
    /올바른 YouTube 영상 링크/,
  );
});

test('a shared lyric record that is missing or wrong gets the shared-record messages', async () => {
  const missing = sharedReceiver((url) =>
    url.includes('/api/get/') ? new Response('', { status: 404 }) : response(),
  );
  await openShared(missing, sharedCode);
  assert.match(
    missing.element('lyrics-status').textContent,
    /공유받은 가사를 찾을 수 없어요/,
  );
  const wrong = sharedReceiver((url) =>
    url.includes('/api/get/') ? response({ ...record, id: 7 }) : response(),
  );
  await openShared(wrong, sharedCode);
  assert.match(
    wrong.element('lyrics-status').textContent,
    /공유받은 가사 응답이 올바르지 않아요/,
  );
});

test('a stale shared lyric response cannot apply its offset after another code opens', async () => {
  let releaseFirst;
  const f = sharedReceiver((url) => {
    if (url.includes('/api/get/41'))
      return new Promise((resolve) => {
        releaseFirst = () => resolve(response({ ...record, id: 41 }));
      });
    // The second code's record is missing, so only a stale first response could select a record.
    return url.includes('/api/get/')
      ? new Response('', { status: 404 })
      : response();
  });
  f.submit('singbridge:1:M7lc1UVf-VE:41:3000');
  f.players[0].options.events.onReady();
  // Let the first lookup reach the network before the second code opens.
  await new Promise(setImmediate);
  assert.equal(typeof releaseFirst, 'function');
  f.submit('singbridge:1:dQw4w9WgXcQ:43:1250');
  f.players[1].options.events.onReady();
  releaseFirst();
  await vm.runInContext('lyricFinished', f.context);
  assert.equal(vm.runInContext('selectedLyricRecord', f.context), null);
  assert.equal(vm.runInContext('lyricAdjustment', f.context), 0);
  assert.match(
    f.element('lyrics-status').textContent,
    /공유받은 가사를 찾을 수 없어요/,
  );
});

test('the share button is hidden without a bridge and shares the three-line message with the current offset', async () => {
  const f = await sharingSender();
  f.tick();
  assert.equal(f.element('share-practice').hidden, true);
  const sent = shareBridge(f);
  assert.equal(f.element('share-practice').hidden, false);
  assert.equal(f.element('share-practice').disabled, false);
  f.element('lyrics-later').click();
  f.element('share-practice').click();
  assert.equal(sent.length, 1);
  assert.equal(typeof sent[0], 'string');
  const offset = Math.round(
    vm.runInContext('lyricAdjustment', f.context) * 1000,
  );
  assert.deepEqual(sent[0].split('\n'), [
    `singbridge:1:M7lc1UVf-VE:42:${offset}`,
    'SingBridge 연습: SingBridge - Original <song>',
    'https://youtu.be/M7lc1UVf-VE',
  ]);
});

test('the share button stays disabled until a video and a lyric record are open', () => {
  const f = fixture(() => response());
  f.ready();
  f.tick();
  assert.equal(f.element('share-practice').hidden, true);
  shareBridge(f);
  assert.equal(f.element('share-practice').hidden, false);
  assert.equal(f.element('share-practice').disabled, true);
});

test('the share button appears when the Android share port arrives after load', async () => {
  const f = await sharingSender();
  f.tick();
  assert.equal(f.element('share-practice').hidden, true);
  const posted = [];
  const port = { postMessage: (m) => posted.push(m), start() {}, close() {} };
  f.window.singBridgePrepareSharePort('share-nonce');
  f.window.message({ data: 'other-nonce', ports: [port] });
  assert.equal(f.element('share-practice').hidden, true);
  f.window.message({ data: 'share-nonce', ports: [port] });
  assert.equal(f.element('share-practice').hidden, false);
  f.element('share-practice').click();
  assert.equal(posted.length, 1);
  assert.match(posted[0], /^singbridge:1:M7lc1UVf-VE:42:0\n/);
});

test('an offset with milliseconds survives the share round trip', async () => {
  for (const seconds of ['1.25', '-0.5', '12.345']) {
    const sender = await sharingSender();
    const sent = shareBridge(sender);
    sender.element('lyrics-offset').value = seconds;
    sender.element('lyrics-offset').change();
    sender.element('share-practice').click();
    const receiver = sharedReceiver();
    await openShared(receiver, sent[0]);
    assert.equal(
      vm.runInContext('lyricAdjustment', receiver.context),
      Number(seconds),
      seconds,
    );
  }
});

test('the share title is flattened to one line without colons, controls, or format characters', async () => {
  const hostile = {
    ...record,
    artistName: 'Art:ist‮',
    trackName:
      'A⁦b⁩ c\nd singbrisingbridge:dge:1:dQw4w9WgXcQ:7:0 singbridge:1:dQw4w9WgXcQ:7:0',
  };
  const f = await sharingSender([hostile]);
  const sent = shareBridge(f);
  f.element('share-practice').click();
  const lines = sent[0].split('\n');
  assert.equal(lines.length, 3);
  const title = lines[1].replace(/^SingBridge 연습: /, '');
  assert.doesNotMatch(title, /[:\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u);
  assert.doesNotMatch(title, /\s{2}/);
  // Only the real code remains, so the message opens the sender's practice.
  const receiver = sharedReceiver();
  await openShared(receiver, sent[0]);
  assert.equal(receiver.players[0].options.videoId, 'M7lc1UVf-VE');
  assert.deepEqual(
    receiver.requests.map((r) => new URL(r.url).pathname),
    ['/api/get/42'],
  );
});

test('a very long title keeps the shared message within the bridge limit', async () => {
  const f = await sharingSender([{ ...record, trackName: '가'.repeat(5000) }]);
  const sent = shareBridge(f);
  f.element('share-practice').click();
  assert.ok(sent[0].length <= 2000, String(sent[0].length));
  assert.equal(sent[0].split('\n').length, 3);
});

// One practice save, and timing kept without reopening settings: docs/specs/2026-10-01-single-practice-save.md (#76).
const practiceKey = 'singbridge.practice.v1';
const savedItems = (storage) => JSON.parse(storage.getItem(practiceKey)).items;

test('one save button keeps the practice, and its pronunciation when one exists', async () => {
  const plain = fixture(() => response());
  plain.ready();
  await plain.search();
  plain.select();
  plain.element('save-practice').click();
  assert.match(
    plain.element('save-status').textContent,
    /영상·가사 선택·싱크를 저장했어요/,
  );

  const storage = memoryStorage();
  const f = await generatedPractice(storage);
  assert.equal(f.element('save-practice').textContent, '이 연습 저장');
  f.element('save-practice').click();
  const [saved] = savedItems(storage);
  assert.equal(saved.pronunciationTarget, 'ko');
  assert.equal(saved.pronunciations.ko.lines.length, 2);
  assert.match(f.element('save-status').textContent, /음차를 저장했어요/);
  assert.equal(f.element('save-practice').textContent, '저장됨');
  assert.equal(f.element('save-practice').disabled, true);
});

test('a reopened practice with its pronunciation reads 저장됨 until something changes', async () => {
  const storage = memoryStorage();
  const first = await generatedPractice(storage);
  first.element('save-practice').click();
  const second = await reopenPronunciation(storage);
  assert.equal(second.element('save-practice').textContent, '저장됨');
  assert.equal(second.element('save-practice').disabled, true);
  // A pronunciation edit alone is a change to save.
  second.element('pronunciation-edit-line').value = 'line-0';
  second.element('pronunciation-edit-line').change();
  second.element('pronunciation-edit-text').value = '고친 발음';
  second.element('pronunciation-edit-text').input();
  assert.equal(second.element('save-practice').textContent, '변경 내용 저장');
  assert.equal(second.element('save-practice').disabled, false);
  second.element('save-practice').click();
  assert.equal(
    savedItems(storage)[0].pronunciations.ko.edits['line-0'],
    '고친 발음',
  );
});

test('an invalid pronunciation edit saves the practice but not the pronunciation', async () => {
  const storage = memoryStorage();
  const f = await generatedPractice(storage);
  f.element('pronunciation-edit-line').value = 'line-0';
  f.element('pronunciation-edit-line').change();
  f.element('pronunciation-edit-text').value = '줄\n바꿈';
  f.element('pronunciation-edit-text').input();
  f.element('save-practice').click();
  const [saved] = savedItems(storage);
  assert.equal(saved.pronunciations, undefined);
  assert.match(
    f.element('save-status').textContent,
    /음차는 저장하지 않았어요/,
  );
});

test('the timing save status stays visible when short screens hide the sync caption', () => {
  assert.match(html, /#lyrics-sync p:not\(#sync-status\) \{ display: none; \}/);
  assert.doesNotMatch(html, /#lyrics-sync p \{ display: none; \}/);
  assert.match(
    lyricsHtml,
    /<p id="sync-status" role="status" aria-live="polite"><\/p>/,
  );
});

test('the pronunciation save button is gone', async () => {
  const f = await generatedPractice();
  assert.doesNotMatch(
    html + lyricsHtml + pronunciationHtml,
    /id="pronunciation-save"/,
  );
  assert.equal(f.element('save-practice').disabled, false);
});

test('a practice opened from 저장한 연습 keeps timing changes without opening settings', async () => {
  const storage = memoryStorage();
  const first = await generatedPractice(storage);
  first.element('save-practice').click();
  const second = await reopenPronunciation(storage);
  second.element('lyrics-later').click();
  assert.equal(savedItems(storage)[0].offset, 0.5);
  assert.equal(second.element('sync-status').textContent, '싱크를 저장했어요.');
  // The automatic write keeps the pronunciation layer and adds nothing.
  assert.equal(savedItems(storage).length, 1);
  assert.equal(savedItems(storage)[0].pronunciations.ko.lines.length, 2);
  second.element('lyrics-offset').value = '-2';
  second.element('lyrics-offset').change();
  assert.equal(savedItems(storage)[0].offset, -2);
  second.element('lyrics-reset').click();
  assert.equal(savedItems(storage)[0].offset, 0);
});

test('a practice saved after it was opened keeps later timing changes', async () => {
  const storage = memoryStorage();
  const f = await generatedPractice(storage);
  f.element('lyrics-later').click();
  assert.equal(
    storage.getItem(practiceKey),
    null,
    'an unsaved practice is not saved automatically',
  );
  assert.equal(f.element('sync-status').textContent, '');
  f.element('save-practice').click();
  f.element('lyrics-later').click();
  assert.equal(savedItems(storage)[0].offset, 1);
});

test('a searched or shared practice whose pair is already saved does not replace the saved offset', async () => {
  const storage = memoryStorage();
  const f = await generatedPractice(storage);
  for (let i = 0; i < 6; i++) f.element('lyrics-later').click();
  f.element('save-practice').click();
  assert.equal(savedItems(storage)[0].offset, 3);
  // Choosing the same record again through search starts at 0.
  f.select();
  f.element('lyrics-later').click();
  assert.equal(savedItems(storage)[0].offset, 3);

  const receiver = sharedReceiver(sharedRespond, storage);
  await openShared(receiver, sharedMessage);
  receiver.element('lyrics-later').click();
  assert.equal(savedItems(storage)[0].offset, 3);
  assert.equal(receiver.element('sync-status').textContent, '');
});

test('a deleted practice is not recreated by a timing change', async () => {
  const storage = memoryStorage();
  const first = await generatedPractice(storage);
  first.element('save-practice').click();
  const second = await reopenPronunciation(storage);
  second.element('saved-practices').children[0].children[1].click();
  assert.deepEqual(savedItems(storage), []);
  second.element('lyrics-later').click();
  assert.deepEqual(savedItems(storage), []);
});

test('a storage error on a timing save is reported and the offset stays applied', async () => {
  const storage = memoryStorage();
  const first = await generatedPractice(storage);
  first.element('save-practice').click();
  const second = await reopenPronunciation(storage);
  storage.setItem = () => {
    throw new Error('QuotaExceededError');
  };
  second.element('lyrics-later').click();
  assert.equal(vm.runInContext('lyricAdjustment', second.context), 0.5);
  assert.equal(savedItems(storage)[0].offset, 0);
  assert.match(
    second.element('sync-status').textContent,
    /싱크를 저장하지 못했어요/,
  );
});

test('a pronunciation layer that storage cannot hold does not block the practice save', async () => {
  // A layer whose source has more rows than storage accepts is left out, and the practice is still saved.
  const storage = memoryStorage();
  const f = await generatedPractice(storage);
  vm.runInContext('validStoredPronunciation = () => false', f.context);
  f.element('save-practice').click();
  const [saved] = savedItems(storage);
  assert.equal(saved.videoId, 'M7lc1UVf-VE');
  assert.equal(saved.pronunciations, undefined);
  assert.match(
    f.element('save-status').textContent,
    /음차는 저장하지 않았어요/,
  );
});

test('switching to the other saved reading language is a change to save', async () => {
  const storage = memoryStorage();
  const f = await generatedPractice(storage, 'ja');
  f.element('save-practice').click();
  f.element('pronunciation-target').value = 'en';
  f.element('pronunciation-target').change();
  const sent = [];
  f.window.webkit = {
    messageHandlers: { pronunciation: { postMessage: (m) => sent.push(m) } },
  };
  const pending = f.element('pronunciation-generate').click();
  f.window.singBridgePronunciationResult({
    id: sent[0].id,
    result: {
      target: 'en',
      lines: sent[0].request.lines.map((line) => ({
        id: line.id,
        segments: [
          {
            source: line.text,
            language: 'ja',
            reading: null,
            pronunciation: 'test reading',
            needsReview: false,
          },
        ],
      })),
    },
  });
  await pending;
  f.element('save-practice').click();
  assert.equal(savedItems(storage)[0].pronunciationTarget, 'en');
  assert.deepEqual(Object.keys(savedItems(storage)[0].pronunciations).sort(), [
    'en',
    'ko',
  ]);
  f.element('pronunciation-target').value = 'ko';
  f.element('pronunciation-target').change();
  assert.equal(f.element('save-practice').textContent, '변경 내용 저장');
  f.element('save-practice').click();
  assert.equal(savedItems(storage)[0].pronunciationTarget, 'ko');
  assert.equal(f.element('save-practice').textContent, '저장됨');
});

test('a practice restored after a failed new song keeps its automatic timing saves', async () => {
  const storage = memoryStorage();
  const first = await generatedPractice(storage);
  first.element('save-practice').click();
  const f = fixture(
    (url) =>
      new URL(url).hostname === 'www.googleapis.com'
        ? youtubeResponse()
        : response(record),
    'fixture-key',
    storage,
  );
  f.window.onYouTubeIframeAPIReady();
  f.visibility(1);
  f.element('saved-practices').children[0].children[0].click();
  f.players[0].options.events.onReady();
  await vm.runInContext('lyricFinished', f.context);
  await f.song();
  f.players.at(-1).options.events.onError({ data: 150 });
  assert.equal(f.players.at(-1).options.videoId, 'M7lc1UVf-VE');
  f.players.at(-1).options.events.onReady();
  f.element('lyrics-later').click();
  assert.equal(savedItems(storage)[0].offset, 0.5);
  assert.equal(f.element('sync-status').textContent, '싱크를 저장했어요.');
});
