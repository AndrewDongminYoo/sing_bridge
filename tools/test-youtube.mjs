import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const kotlin = readFileSync(
  new URL(
    "../shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubeEmbed.kt",
    import.meta.url
  ),
  "utf8"
);
const html = kotlin.split('"""')[1];
assert.ok(html, "Missing shipped HTML");
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .join("\n");
assert.ok(script, "Missing shipped script");
const lyricsPath = new URL(
  "../shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubeLyrics.kt",
  import.meta.url
);
const lyricsHtml = readFileSync(lyricsPath, "utf8").split('"""')[1];
const lyricsScript = [...lyricsHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .join("\n");
const searchPath = new URL(
  "../shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubeSearch.kt",
  import.meta.url
);
const searchHtml = readFileSync(searchPath, "utf8").split('"""')[1];
const searchScript = [...searchHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .join("\n");

const libraryPath = new URL("../shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubeLibrary.kt", import.meta.url);
const libraryHtml = readFileSync(libraryPath, "utf8").split('"""')[1];
const libraryScript = [...libraryHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join("\n");
const pronunciationHtml = readFileSync(new URL('../shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubePronunciation.kt', import.meta.url), 'utf8').split('"""')[1];
const pronunciationScript = [...pronunciationHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}
function fixture(respond = async () => new Response("[]"), apiKey = "fixture-key", storage = memoryStorage()) {
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
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
      scrollTo(options) { this.scrolls.push(options); this.scrollTop = options.top; },
      value: "",
      _text: "",
      get textContent() { return this._text + this.children.map(child => child.textContent).join(""); },
      set textContent(value) { this._text = value; this.children = []; },
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
        this._text = ""; this.children = children;
      },
      append(...children) {
        for (const child of children) { child.offsetTop = this.children.length * 100; this.children.push(child); }
      },
      set innerHTML(_) {
        throw new Error("Untrusted HTML insertion");
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
    addEventListener(type, fn) { this[type] = fn; },
    matchMedia() { return { matches: this.reducedMotion || false }; },
  };
  const requests = [];
  let now = 1700000000000;
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
  element("repeat-song").checked = true;
  // Match the script order in the shipped HTML, including deferred function references.
  vm.runInContext(searchScript.replace("__YOUTUBE_API_KEY__", apiKey), context);
  vm.runInContext(pronunciationScript, context);
  vm.runInContext(lyricsScript, context);
  vm.runInContext(libraryScript, context);
  vm.runInContext(script, context);
  return {
    context,
    element,
    window,
    document,
    currentLyric() { return element("lyrics-timing").children.find(n => n.attributes["aria-current"] === "true") || { textContent: "" }; },
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
    async song(query = "Vaundy - 踊り子") {
      element("song-query").value = query;
      await element("song-search").submit?.({ preventDefault() {} });
    },
    async search(query = "SingBridge original") {
      element("lyrics-query").value = query;
      await element("lyrics-search").submit?.({ preventDefault() {} });
    },
    select(index = 0) {
      element("lyrics-results").children[index].click();
    },
    visibility: (ratio) => intersection([{ intersectionRatio: ratio }]),
    submit(input = "M7lc1UVf-VE") {
      element("video-url").value = input;
      element("open").submit({ preventDefault() {} });
    },
    ready() {
      window.onYouTubeIframeAPIReady();
      this.visibility(1);
      this.submit();
      players.at(-1).options.events.onReady();
    },
  };
}

test("accepts supported YouTube links and exact IDs", () => {
  const { context } = fixture();
  for (const input of [
    "M7lc1UVf-VE",
    "https://www.youtube.com/watch?v=M7lc1UVf-VE&t=2",
    "https://youtu.be/M7lc1UVf-VE?si=abc",
    "https://m.youtube.com/shorts/M7lc1UVf-VE",
    "https://www.youtube.com/embed/M7lc1UVf-VE",
    "https://www.youtube.com/live/M7lc1UVf-VE",
  ]) {
    assert.equal(context.videoId(input), "M7lc1UVf-VE", input);
  }
});
test("rejects unrelated hosts, credentials, scripts, and malformed IDs", () => {
  const { context } = fixture();
  for (const input of [
    "",
    "<script>x</script>",
    "javascript:alert(1)",
    "https://youtube.com.evil.test/watch?v=M7lc1UVf-VE",
    "https://evil@youtube.com/watch?v=M7lc1UVf-VE",
    "https://youtu.be/M7lc1UVf-VE/extra",
    "https://youtube.com/watch?v=short",
    "http://youtube.com/watch?v=M7lc1UVf-VE",
    "https://youtube.com:444/watch?v=M7lc1UVf-VE",
  ])
    assert.equal(context.videoId(input), null, input);
});
test("does not create a player before API readiness or for invalid input", () => {
  const f = fixture();
  f.submit();
  assert.equal(f.players.length, 0);
  f.window.onYouTubeIframeAPIReady();
  f.submit("invalid");
  assert.equal(f.players.length, 0);
});
test("uses official controls, no autoplay, and reads real player time", () => {
  const f = fixture();
  f.ready();
  const p = f.players[0];
  assert.equal(p.options.playerVars.autoplay, 0);
  assert.equal(p.options.playerVars.controls, 1);
  p.position = 42;
  f.intervals.forEach((fn) => fn());
  assert.match(f.element("position").textContent, /0:42/);
  assert.equal(f.element("forward").disabled, false);
});
test("bounds seeks by duration and ignores unknown duration", () => {
  const f = fixture();
  f.ready();
  const p = f.players[0];
  p.position = 99;
  f.element("forward").click();
  assert.deepEqual(p.seek, [100, true]);
  p.position = 2;
  f.element("back").click();
  assert.deepEqual(p.seek, [0, true]);
  p.duration = 0;
  p.seek = null;
  f.element("forward").click();
  assert.equal(p.seek, null);
});
test("pauses on native background, document hide, and loss of visibility", () => {
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
test("replacing a video destroys old player and rejects stale callbacks", () => {
  const f = fixture();
  f.ready();
  const old = f.players[0];
  f.submit("dQw4w9WgXcQ");
  assert.equal(old.destroyed, true);
  old.options.events.onReady();
  assert.equal(f.element("forward").disabled, true);
  old.options.events.onError({ data: 153 });
  assert.doesNotMatch(f.element("status").textContent, /153/);
  f.players[1].options.events.onReady();
  assert.equal(f.element("forward").disabled, false);
});
test("embedding failures disable seeks and allow choosing another video", () => {
  const f = fixture();
  f.ready();
  f.players[0].options.events.onError({ data: 150 });
  assert.equal(f.element("forward").disabled, true);
  assert.match(f.element("status").textContent, /다른 영상/);
  f.submit("dQw4w9WgXcQ");
  assert.equal(f.players.length, 2);
});
test("preserves specific embedding errors when the loading timeout fires", () => {
  const f = fixture();
  f.ready();
  f.players[0].options.events.onError({ data: 153 });
  f.timeouts.forEach((fn) => fn());
  assert.match(f.element("status").textContent, /153/);
});

const record = {
  id: 42,
  trackName: "Original <song>",
  artistName: "SingBridge",
  albumName: "Test",
  duration: 100,
  instrumental: false,
  plainLyrics: "First\nSecond",
  syncedLyrics: "[00:02.00]First\n[00:05.00]Second\n[00:08.00]",
};
const response = (records = [record]) =>
  new Response(JSON.stringify(records), { headers: { "Content-Type": "application/json" } });

test("search identifies the client and waits for explicit candidate selection", async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search("Song & artist");
  assert.equal(f.requests.length, 1);
  const request = f.requests[0];
  assert.equal(new URL(request.url).searchParams.get("q"), "Song & artist");
  assert.match(request.options.headers["Lrclib-Client"], /SingBridge.*github.com/);
  assert.equal(f.element("lyrics-results").children.length, 1);
  assert.match(f.element("lyrics-results").children[0].textContent, /Original <song>/);
  assert.equal(f.currentLyric().textContent, "");
  f.select();
  f.players[0].position = 2;
  f.tick();
  assert.equal(f.currentLyric().textContent, "First");
});

test("timed lines use actual playback boundaries, blank markers and signed offsets", async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  for (const [position, expected] of [
    [1.99, ""],
    [2, "First"],
    [5, "Second"],
    [8, ""],
    [100, ""],
  ]) {
    f.players[0].position = position;
    f.tick();
    assert.equal(f.currentLyric().textContent, expected);
  }
  f.element("lyrics-offset").value = "2";
  f.element("lyrics-offset").change();
  f.players[0].position = 3;
  f.tick();
  assert.equal(f.currentLyric().textContent, "");
  f.players[0].position = 4;
  f.tick();
  assert.equal(f.currentLyric().textContent, "First");
  f.element("lyrics-offset").value = "-1";
  f.element("lyrics-offset").change();
  f.players[0].position = 4;
  f.tick();
  assert.equal(f.currentLyric().textContent, "Second");
});

test("plain lyrics stay unsynchronized and provider markup remains text", async () => {
  const f = fixture(() =>
    response([
      { ...record, syncedLyrics: null, plainLyrics: "<img src=x onerror=alert(1)>\nOriginal" },
    ])
  );
  f.ready();
  await f.search();
  f.select();
  f.tick();
  assert.match(f.element("lyrics-status").textContent, /시간표시/);
  assert.equal(f.element("lyrics-plain").textContent, "<img src=x onerror=alert(1)>\nOriginal");
  assert.equal(f.currentLyric().textContent, "");
  assert.equal(f.element("lyrics-offset").disabled, true);
});

test("changing video aborts and discards stale search results", async () => {
  let resolve;
  const f = fixture(
    () =>
      new Promise((r) => {
        resolve = r;
      })
  );
  f.ready();
  const pending = f.search();
  assert.equal(f.requests.length, 1);
  f.submit("dQw4w9WgXcQ");
  resolve(response());
  await pending;
  assert.equal(f.element("lyrics-results").children.length, 0);
  assert.equal(f.element("lyrics-offset").value, "0");
  assert.equal(f.requests[0].options.signal.aborted, true);
});

test("rate limiting honors Retry-After without an automatic retry", async () => {
  const f = fixture(() => new Response("", { status: 429, headers: { "Retry-After": "120" } }));
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

test("empty, malformed and oversized responses report errors without selectable records", async () => {
  for (const make of [
    () => response([]),
    () => response({ records: [record] }),
    () => new Response("x".repeat(4 * 1024 * 1024 + 1)),
    () => {
      throw new Error("offline");
    },
  ]) {
    const f = fixture(make);
    f.ready();
    await f.search();
    assert.equal(f.element("lyrics-results").children.length, 0);
    assert.ok(f.element("lyrics-status").textContent.length > 0);
    assert.equal(f.element("lyrics-search-button").disabled, false);
  }
});

test("searches are sequential and timeout aborts the request", async () => {
  const f = fixture(
    (_url, options) =>
      new Promise((_resolve, reject) =>
        options.signal.addEventListener("abort", () => reject(new Error("aborted")))
      )
  );
  f.ready();
  const pending = f.search();
  await f.search();
  assert.equal(f.requests.length, 1);
  f.timeouts.at(-1)();
  await pending;
  assert.equal(f.requests[0].options.signal.aborted, true);
  assert.equal(f.element("lyrics-search-button").disabled, false);
});

test("multi-timestamp and same-time lyrics merge, unsupported offsets fail explicitly", async () => {
  const f = fixture(() =>
    response([
      {
        ...record,
        syncedLyrics: "[ti:Original]\n[00:02.00][00:06.000]Echo\n[00:02.00]Harmony\n[00:08.00]",
      },
    ])
  );
  f.ready();
  await f.search();
  f.select();
  f.players[0].position = 2;
  f.tick();
  assert.equal(f.currentLyric().textContent, "Echo\nHarmony");
  f.players[0].position = 6;
  f.tick();
  assert.equal(f.currentLyric().textContent, "Echo");
  const bad = fixture(() =>
    response([{ ...record, syncedLyrics: "[offset:100]\n[00:02.00]Line", plainLyrics: null }])
  );
  bad.ready();
  await bad.search();
  bad.select();
  assert.match(bad.element("lyrics-status").textContent, /offset/);
  assert.equal(bad.currentLyric().textContent, "");
});

test("replacing a video clears an existing selection and its offset", async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  f.element("lyrics-offset").value = "2";
  f.element("lyrics-offset").change();
  f.players[0].position = 4;
  f.tick();
  assert.equal(f.currentLyric().textContent, "First");
  f.submit("dQw4w9WgXcQ");
  assert.equal(f.currentLyric().textContent, "");
  assert.equal(f.element("lyrics-source").textContent, "");
  assert.equal(f.element("lyrics-offset").value, "0");
  assert.equal(f.element("lyrics-offset").disabled, true);
});

test("search requires a ready video and a bounded query", async () => {
  const f = fixture();
  await f.search();
  assert.equal(f.requests.length, 0);
  f.ready();
  await f.search(" ");
  await f.search("x".repeat(121));
  assert.equal(f.requests.length, 0);
});

test("unsuccessful responses abort their unread body without changing the error message", async () => {
  for (const status of [429, 503]) {
    const f = fixture(
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(1024));
            },
          }),
          { status }
        )
    );
    f.ready();
    await f.search();
    assert.equal(f.requests[0].options.signal.aborted, true);
    assert.doesNotMatch(f.element("lyrics-status").textContent, /시간이 초과/);
  }
});



const youtubeResponse = () =>
  response({
    items: [
      {
        id: { videoId: "7HgJIAUtICU" },
        snippet: { title: "<Song>", channelTitle: "Official artist" },
      },
    ],
  });

test("song search opens the top embeddable video and hands original terms to lyrics once ready", async () => {
  const f = fixture((url) =>
    new URL(url).hostname === "www.googleapis.com" ? youtubeResponse() : response()
  );
  f.window.onYouTubeIframeAPIReady();
  f.visibility(1);
  await f.song("G-Dragon - A Song - Live");
  assert.equal(f.requests.length, 1);
  const request = f.requests[0],
    query = new URL(request.url).searchParams;
  assert.equal(query.get("q"), "G-Dragon A Song - Live");
  for (const [name, value] of Object.entries({
    part: "snippet",
    type: "video",
    order: "relevance",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    maxResults: "1",
  }))
    assert.equal(query.get(name), value);
  assert.equal(request.options.headers["X-Goog-Api-Key"], "fixture-key");
  assert.equal(query.has("key"), false);
  assert.equal(f.players[0].options.videoId, "7HgJIAUtICU");
  assert.equal(f.players[0].options.playerVars.autoplay, 0);
  assert.match(f.element("song-result").textContent, /<Song>.*Official artist/);
  f.players[0].options.events.onReady();
  f.players[0].options.events.onReady();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.requests.length, 2);
  assert.equal(new URL(f.requests[1].url).searchParams.get("q"), "G-Dragon A Song - Live");
  assert.equal(f.requests[1].options.headers["X-Goog-Api-Key"], undefined);
});

test("missing configuration, API readiness, or artist/title does not issue a song request", async () => {
  const absent = fixture(undefined, "");
  absent.window.onYouTubeIframeAPIReady();
  await absent.song();
  assert.equal(absent.requests.length, 0);
  const f = fixture();
  await f.song();
  assert.equal(f.requests.length, 0);
  f.window.onYouTubeIframeAPIReady();
  for (const value of ["title only", " - Title", "Artist - ", "a".repeat(121)]) await f.song(value);
  assert.equal(f.requests.length, 0);
});

test("failed or malformed song searches preserve the existing video and hide provider error details", async () => {
  for (const make of [
    () => response({ items: [] }),
    () => response({ items: [{ id: { videoId: "invalid" }, snippet: {} }] }),
    () => new Response("secret fixture-key", { status: 403 }),
    () => {
      throw new Error("secret fixture-key");
    },
  ]) {
    const f = fixture(make);
    f.ready();
    const original = f.players[0];
    await f.song();
    assert.equal(original.destroyed, false);
    assert.equal(f.players.length, 1);
    assert.ok(f.element("song-status").textContent);
    assert.doesNotMatch(f.element("song-status").textContent, /fixture-key/);
  }
});

test("a direct link cancels an in-flight song search and rejects its stale completion", async () => {
  let complete;
  const f = fixture(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      })
  );
  f.ready();
  const search = f.song();
  assert.equal(f.requests.length, 1);
  f.submit("dQw4w9WgXcQ");
  complete(youtubeResponse());
  await search;
  assert.equal(f.players.length, 2);
  assert.equal(f.players[1].options.videoId, "dQw4w9WgXcQ");
  assert.equal(f.requests[0].options.signal.aborted, true);
  assert.equal(f.element("song-result").textContent, "노래 연습");
});

test("an ignored manual lyric request does not lose the pending request before song handoff", async () => {
  let finishOld;
  const f = fixture((url) => {
    if (new URL(url).hostname === "www.googleapis.com") return youtubeResponse();
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
  assert.equal(f.requests.filter((r) => new URL(r.url).hostname === "lrclib.net").length, 2);
});

test("only the newest song search may replace the player", async () => {
  const completions = [];
  const f = fixture(() => new Promise((resolve) => completions.push(resolve)));
  f.ready();
  const old = f.song("Artist - Old");
  const latest = f.song("Artist - New");
  completions[1](youtubeResponse());
  await latest;
  completions[0](
    response({
      items: [{ id: { videoId: "dQw4w9WgXcQ" }, snippet: { title: "Old", channelTitle: "Old" } }],
    })
  );
  await old;
  assert.equal(f.players.length, 2);
  assert.equal(f.players[1].options.videoId, "7HgJIAUtICU");
  assert.equal(f.requests[0].options.signal.aborted, true);
});

test("a newer search invalidates a previous video readiness lyric handoff", async () => {
  let count = 0;
  const f = fixture(() => (++count === 1 ? youtubeResponse() : response({ items: [] })));
  f.window.onYouTubeIframeAPIReady();
  await f.song();
  const previous = f.players[0];
  await f.song("Artist - Other");
  previous.options.events.onReady();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.requests.length, 2);
  assert.ok(f.requests.every((r) => new URL(r.url).hostname === "www.googleapis.com"));
});

test("song request timeout aborts and oversized responses cannot replace the video", async () => {
  const f = fixture(
    (_url, options) =>
      new Promise((_resolve, reject) =>
        options.signal.addEventListener("abort", () => reject(new Error("aborted")))
      )
  );
  f.ready();
  const pending = f.song();
  f.timeouts.at(-1)();
  await pending;
  assert.equal(f.requests[0].options.signal.aborted, true);
  assert.equal(f.element("song-search-button").disabled, false);
  assert.match(f.element("song-status").textContent, /시간이 초과/);
  const large = fixture(() => new Response("x".repeat(4 * 1048576 + 1)));
  large.ready();
  await large.song();
  assert.equal(large.players.length, 1);
  assert.equal(large.players[0].destroyed, false);
});

test("song search observes provider retry delay without sending extra requests", async () => {
  const f = fixture(() => new Response("", { status: 429, headers: { "Retry-After": "120" } }));
  f.ready();
  await f.song();
  await f.song();
  assert.equal(f.requests.length, 1);
  f.advance(120000);
  await f.song();
  assert.equal(f.requests.length, 2);
});

test("unplayable searched video restores previous video and selected lyrics without autoplay", async () => {
  const f = fixture((url) => (url.includes("googleapis.com") ? youtubeResponse() : response()));
  f.ready();
  await f.search();
  f.select();
  f.players[0].position = 6;
  f.element("lyrics-offset").value = "1";
  f.element("lyrics-offset").change();
  await f.song();
  const candidate = f.players.at(-1);
  candidate.options.events.onReady();
  candidate.options.events.onError({ data: 150 });
  const restored = f.players.at(-1);
  assert.notEqual(restored, candidate);
  assert.equal(restored.options.videoId, "M7lc1UVf-VE");
  assert.equal(restored.options.playerVars.autoplay, 0);
  restored.options.events.onReady();
  assert.match(f.element("lyrics-source").textContent, /LRCLIB #42/);
  assert.equal(f.element("lyrics-offset").value, "1");
  assert.match(f.element("song-status").textContent, /이전 영상/);
  candidate.options.events.onReady();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.requests.filter((r) => r.url.includes("lrclib")).length, 1);
});

test("searched player readiness timeout restores once and ignores late candidate callbacks", async () => {
  const f = fixture(() => youtubeResponse());
  f.ready();
  await f.song();
  const candidate = f.players.at(-1);
  f.timeouts.at(-1)();
  assert.equal(f.players.length, 3);
  assert.equal(f.players.at(-1).options.videoId, "M7lc1UVf-VE");
  candidate.options.events.onReady();
  candidate.options.events.onError({ data: 150 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.players.length, 3);
  assert.equal(f.requests.length, 1);
});

test("errors after successful playback do not revert a deliberately played video", async () => {
  const f = fixture(() => youtubeResponse());
  f.ready();
  await f.song();
  const candidate = f.players.at(-1);
  candidate.options.events.onStateChange({ data: 1 });
  candidate.options.events.onError({ data: 150 });
  assert.equal(f.players.length, 2);
  assert.match(f.element("status").textContent, /다른 영상/);
});

test("lyrics rank by video duration before limiting results, with stable ties and unknown lengths last", async () => {
  const records = [
    null,
    ...Array.from({ length: 21 }, (_, i) => ({
      ...record,
      id: i + 1,
      trackName: "Far " + i,
      duration: 300 + i,
    })),
    { ...record, id: 50, trackName: "Closest", duration: 100 },
    { ...record, id: 51, trackName: "Tie first", duration: 99 },
    { ...record, id: 52, trackName: "Tie second", duration: 101 },
    { ...record, id: 53, trackName: "Unknown", duration: null },
  ];
  const f = fixture(() => response(records));
  f.ready();
  await f.search();
  const names = f.element("lyrics-results").children.map((n) => n.textContent);
  assert.match(names[0], /^Closest/);
  assert.match(names[1], /^Tie first/);
  assert.match(names[2], /^Tie second/);
  assert.equal(names.length, 20);
  assert.equal(
    names.some((n) => n.startsWith("Unknown")),
    false
  );
  assert.match(f.element("lyrics-ranking").textContent, /1:40/);
  assert.match(names[1], /1초 차이/);
  assert.equal(f.element("lyrics-source").textContent, "");
});

test("unknown video duration preserves provider order then sorts once metadata arrives without extra requests", async () => {
  const f = fixture(() =>
    response([
      { ...record, id: 1, trackName: "Far", duration: 300 },
      { ...record, id: 2, trackName: "Near", duration: 100 },
      { ...record, id: 3, trackName: "Unknown", duration: 0 },
    ])
  );
  f.ready();
  f.players[0].duration = 0;
  await f.search();
  assert.match(f.element("lyrics-results").children[0].textContent, /^Far/);
  f.players[0].duration = 100;
  f.tick();
  assert.match(f.element("lyrics-results").children[0].textContent, /^Near/);
  const first = f.element("lyrics-results").children[0];
  f.tick();
  assert.equal(f.element("lyrics-results").children[0], first);
  assert.equal(f.requests.length, 1);
  f.select();
  assert.match(f.element("lyrics-source").textContent, /LRCLIB #2/);
  f.submit("dQw4w9WgXcQ");
  f.tick();
  assert.equal(f.element("lyrics-ranking").textContent, "");
  assert.equal(f.element("lyrics-results").children.length, 0);
});

test("replacing a video collapses sync controls while invalid links preserve the current practice", () => {
  const f = fixture();
  f.ready();
  f.element("lyrics-sync").open = true;
  f.submit("invalid");
  assert.equal(f.element("lyrics-sync").open, true);
  f.submit("dQw4w9WgXcQ");
  assert.equal(f.element("lyrics-sync").open, false);
});

test("offset buttons adjust lyric timing without seeking and reset to the original timestamps", async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  f.players[0].position = 1.75;
  f.tick();
  assert.equal(f.currentLyric().textContent, "");
  f.element("lyrics-earlier").click();
  assert.equal(f.element("lyrics-offset").value, "-0.5");
  assert.equal(f.currentLyric().textContent, "First");
  assert.match(f.element("lyrics-offset-value").textContent, /0.5초 일찍/);
  f.element("lyrics-later").click();
  f.element("lyrics-later").click();
  assert.equal(f.element("lyrics-offset").value, "0.5");
  assert.match(f.element("lyrics-offset-value").textContent, /0.5초 늦게/);
  assert.equal(f.players[0].seek, undefined);
  f.element("lyrics-reset").click();
  assert.equal(f.element("lyrics-offset").value, "0");
  assert.equal(f.element("lyrics-reset").disabled, true);
});

test("offset buttons clamp to limits and are unavailable for plain lyrics or replaced videos", async () => {
  const f = fixture(() => response([record, { ...record, id: 43, syncedLyrics: null }]));
  f.ready();
  await f.search();
  f.select();
  f.element("lyrics-offset").value = "599.9";
  f.element("lyrics-offset").change();
  f.element("lyrics-later").click();
  assert.equal(f.element("lyrics-offset").value, "600");
  assert.equal(f.element("lyrics-later").disabled, true);
  f.element("lyrics-offset").value = "-599.9";
  f.element("lyrics-offset").change();
  f.element("lyrics-earlier").click();
  assert.equal(f.element("lyrics-offset").value, "-600");
  assert.equal(f.element("lyrics-earlier").disabled, true);
  f.select(1);
  assert.equal(f.element("lyrics-earlier").disabled, true);
  assert.equal(f.element("lyrics-later").disabled, true);
  f.element("lyrics-later").click();
  assert.equal(f.element("lyrics-offset").value, "0");
  f.select(0);
  f.submit("dQw4w9WgXcQ");
  assert.equal(f.element("lyrics-later").disabled, true);
});

test("search and practice screens switch explicitly and hidden playback cannot resume", () => {
  const f = fixture();
  f.ready();
  const p = f.players[0];
  assert.equal(f.element("discovery-screen").hidden, true);
  assert.equal(f.element("practice-screen").hidden, false);
  f.element("find-another-song").click();
  assert.equal(f.element("discovery-screen").hidden, false);
  assert.equal(f.element("practice-screen").hidden, true);
  assert.ok(p.pauses > 0);
  const pauses = p.pauses;
  f.visibility(1);
  p.options.events.onStateChange({ data: 1 });
  assert.equal(p.pauses, pauses + 1);
  f.element("return-to-practice").click();
  assert.equal(f.element("practice-screen").hidden, false);
  assert.equal(p.pauses, pauses + 1);
  assert.equal(f.players.length, 1);
});

test("invalid direct links report an error on the search screen without switching screens", () => {
  const f = fixture();
  f.ready();
  f.element("find-another-song").click();
  f.submit("invalid");
  assert.equal(f.element("discovery-screen").hidden, false);
  assert.match(f.element("song-status").textContent, /올바른 YouTube/);
});

test("single-song repeat defaults on and can be toggled without autoplay or seeking", () => {
  const f = fixture();
  f.ready();
  const p = f.players[0];
  assert.equal(p.options.playerVars.loop, 1);
  assert.equal(p.options.playerVars.playlist, p.options.videoId);
  assert.equal(p.loop, true);
  assert.equal(p.options.playerVars.autoplay, 0);
  f.element("repeat-song").checked = false;
  f.element("repeat-song").change();
  assert.equal(p.loop, false);
  assert.equal(p.seek, undefined);
  f.submit("7HgJIAUtICU");
  assert.equal(f.players.at(-1).options.playerVars.loop, 0);
  assert.equal(f.players.at(-1).options.playerVars.playlist, "7HgJIAUtICU");
  f.players.at(-1).options.events.onReady();
  f.element("repeat-song").checked = true;
  f.element("repeat-song").change();
  assert.equal(f.players.at(-1).loop, true);
  f.window.singBridgePause();
  const paused = f.players.at(-1).pauses;
  f.players.at(-1).options.events.onStateChange({ data: 1 });
  assert.equal(f.players.at(-1).pauses, paused + 1);
});

test("refined playback duration updates ranking without changing a selected lyric", async () => {
  const f = fixture(() =>
    response([
      { ...record, id: 1, trackName: "Initial", duration: 246 },
      { ...record, id: 2, trackName: "Refined", duration: 245 },
    ])
  );
  f.ready();
  f.players[0].duration = 246;
  await f.search();
  f.select();
  f.players[0].duration = 245.4;
  f.tick();
  assert.match(f.element("lyrics-results").children[0].textContent, /^Refined/);
  assert.match(f.element("lyrics-source").textContent, /LRCLIB #1/);
  const first = f.element("lyrics-results").children[0];
  f.players[0].duration = 245.39;
  f.tick();
  assert.equal(f.element("lyrics-results").children[0], first);
});

test("returning to existing practice cancels a pending song search and ignores its late result", async () => {
  let resolve;
  const f = fixture(
    () =>
      new Promise((r) => {
        resolve = r;
      })
  );
  f.ready();
  f.element("find-another-song").click();
  const pending = f.song();
  f.element("return-to-practice").click();
  assert.equal(f.requests[0].options.signal.aborted, true);
  resolve(youtubeResponse());
  await pending;
  assert.equal(f.players.length, 1);
  assert.equal(f.element("practice-screen").hidden, false);
});

test("lyrics panel pauses playback, blocks hidden playback and closes after selection without autoplay", async () => {
  const f = fixture(() => response());
  f.ready();
  const p = f.players[0];
  f.element("lyrics-panel-open").click();
  assert.equal(f.element("lyrics-panel").open, true);
  assert.ok(p.pauses > 0);
  const pauses = p.pauses;
  p.options.events.onStateChange({ data: 1 });
  assert.equal(p.pauses, pauses + 1);
  await f.search();
  f.select();
  assert.equal(f.element("lyrics-panel").open, false);
  assert.equal(p.seek, undefined);
  assert.equal(f.element("lyrics-placeholder").hidden, true);
  f.element("lyrics-panel-open").click();
  f.element("lyrics-panel-close").click();
  assert.equal(f.element("lyrics-panel").open, false);
});

test("changing videos clears the lyrics panel and shows an actionable empty state", async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  f.element("lyrics-panel-open").click();
  f.submit("7HgJIAUtICU");
  assert.equal(f.element("lyrics-panel").open, false);
  assert.equal(f.element("lyrics-placeholder").hidden, false);
});



test("failed or cancelled replacement searches preserve active video metadata", async () => {
  let replacement, resolve;
  const f = fixture((url) => {
    if (!url.includes("googleapis.com")) return response();
    if (replacement === "fail") return new Response("", { status: 403 });
    if (replacement === "pending") return new Promise((r) => { resolve = r; });
    return youtubeResponse();
  });
  f.ready();
  await f.song();
  f.players.at(-1).options.events.onReady();
  await new Promise((r) => setImmediate(r));
  const label = f.element("song-result").textContent;
  assert.match(label, /<Song>.*Official artist/);
  replacement = "fail";
  f.element("find-another-song").click();
  await f.song("Another - Song");
  f.element("return-to-practice").click();
  assert.equal(f.element("song-result").textContent, label);
  replacement = "pending";
  f.element("find-another-song").click();
  const pending = f.song("Another - Song");
  f.element("return-to-practice").click();
  resolve(youtubeResponse());
  await pending;
  assert.equal(f.element("song-result").textContent, label);
  f.element("lyrics-panel-open").click();
  assert.equal(f.element("video-details").textContent, label);
  f.element("lyrics-panel-close").click();
  f.submit();
  assert.equal(f.element("song-result").textContent, "노래 연습");
});

test("failed candidate playback restores the previous video's title and channel", async () => {
  let replacement = false;
  const f = fixture((url) => {
    if (!url.includes("googleapis.com")) return response();
    return replacement ? Response.json({ items: [{ id: { videoId: "M7lc1UVf-VE" }, snippet: { title: "Unavailable", channelTitle: "Other" } }] }) : youtubeResponse();
  });
  f.ready();
  await f.song();
  f.players.at(-1).options.events.onReady();
  f.players.at(-1).options.events.onStateChange({ data: 1 });
  await new Promise((r) => setImmediate(r));
  const label = f.element("song-result").textContent;
  replacement = true;
  await f.song("Another - Song");
  f.players.at(-1).options.events.onError({ data: 150 });
  f.players.at(-1).options.events.onReady();
  assert.equal(f.element("song-result").textContent, label);
});

test("chained loading candidates retain the last usable practice snapshot", async () => {
  const f = fixture((url) => url.includes("googleapis.com") ? youtubeResponse() : response());
  f.ready();
  await f.search();
  f.select();
  f.players[0].position = 6;
  f.element("lyrics-offset").value = "1";
  f.element("lyrics-offset").change();
  await f.song();
  const first = f.players.at(-1);
  f.element("find-another-song").click();
  await f.song("Another - Candidate");
  const second = f.players.at(-1);
  second.options.events.onError({ data: 150 });
  const restored = f.players.at(-1);
  assert.equal(restored.options.videoId, "M7lc1UVf-VE");
  restored.options.events.onReady();
  assert.match(f.element("lyrics-source").textContent, /LRCLIB #42/);
  assert.equal(f.element("lyrics-offset").value, "1");
  assert.equal(restored.options.playerVars.start, 6);
  const count = f.players.length;
  first.options.events.onError({ data: 150 });
  assert.equal(f.players.length, count);
});

test("background candidate restoration preserves discovery and a newer search", async () => {
  let hold = false, resolve;
  const f = fixture(() => hold ? new Promise((r) => { resolve = r; }) : youtubeResponse());
  f.ready();
  await f.song();
  const candidate = f.players.at(-1);
  f.element("find-another-song").click();
  hold = true;
  const pending = f.song("Another - Candidate");
  candidate.options.events.onError({ data: 150 });
  assert.equal(f.players.at(-1).options.videoId, "M7lc1UVf-VE");
  assert.equal(f.element("practice-screen").hidden, true);
  assert.equal(f.element("discovery-screen").hidden, false);
  resolve(youtubeResponse());
  await pending;
  assert.equal(f.element("practice-screen").hidden, false);
  assert.equal(f.players.at(-1).options.videoId, "7HgJIAUtICU");
});

test("restoration after leaving a loading candidate does not reopen practice", async () => {
  const f = fixture(() => youtubeResponse());
  f.ready();
  await f.song();
  f.element("find-another-song").click();
  f.timeouts.at(-1)();
  assert.equal(f.players.at(-1).options.videoId, "M7lc1UVf-VE");
  assert.equal(f.element("practice-screen").hidden, true);
  f.players.at(-1).options.events.onReady();
  assert.equal(f.element("discovery-screen").hidden, false);
});

test("new candidates during recovery loading retain the usable snapshot without recursive recovery", async () => {
  const f = fixture(() => youtubeResponse());
  f.ready();
  await f.song();
  f.players.at(-1).options.events.onError({ data: 150 });
  const recovery = f.players.at(-1);
  const count = f.players.length;
  recovery.options.events.onError({ data: 150 });
  assert.equal(f.players.length, count);
  await f.song("Another - Candidate");
  f.players.at(-1).options.events.onError({ data: 150 });
  assert.equal(f.players.at(-1).options.videoId, "M7lc1UVf-VE");
});


test("timed rows keep identity and scroll only when the active timestamp changes", async () => {
  const f = fixture(() => response()); f.ready(); await f.search(); f.select();
  const rows = [...f.element("lyrics-timing").children];
  assert.equal(rows.length, 3);
  const reading = f.element("lyric-window");
  f.players[0].position = 2; f.tick();
  assert.equal(f.currentLyric().textContent, "First");
  const calls = reading.scrolls.length;
  f.tick(); assert.equal(reading.scrolls.length, calls);
  f.players[0].position = 5; f.tick();
  assert.equal(f.currentLyric(), rows[1]);
  assert.deepEqual(f.element("lyrics-timing").children, rows);
  assert.equal(reading.scrolls.at(-1).behavior, "smooth");
  assert.equal(reading.scrolls.length, calls + 1);
  assert.equal(f.players[0].seek, undefined);
});

test("manual lyric reading suspends tracking then catches up without a timestamp change", async () => {
  const f = fixture(() => response()); f.ready(); await f.search(); f.select();
  const reading = f.element("lyric-window");
  reading.wheel(); const calls = reading.scrolls.length;
  f.players[0].position = 2; f.tick();
  assert.equal(reading.scrolls.length, calls);
  f.advance(3999); f.tick(); assert.equal(reading.scrolls.length, calls);
  f.advance(1); f.tick(); assert.equal(reading.scrolls.length, calls + 1);
  reading.pointerdown(); const heldCalls = reading.scrolls.length;
  f.advance(8000); f.tick();
  assert.equal(reading.scrolls.length, heldCalls);
  f.window.pointerup(); f.advance(4000); f.tick();
  assert.equal(reading.scrolls.length, heldCalls + 1);
});

test("reduced motion uses immediate alignment and seek or repeat can move backwards", async () => {
  const f = fixture(() => response()); f.window.reducedMotion = true;
  f.ready(); await f.search(); f.select();
  f.players[0].position = 5; f.tick();
  const reading = f.element("lyric-window");
  assert.equal(reading.scrolls.at(-1).behavior, "instant");
  const secondTop = reading.scrollTop;
  f.players[0].position = 2; f.tick();
  assert.ok(reading.scrollTop < secondTop);
  assert.equal(f.currentLyric().textContent, "First");
  f.players[0].position = 0; f.tick();
  assert.equal(f.currentLyric().textContent, "");
});

test("hidden practice and open settings defer tracking until practice is visible", async () => {
  const f = fixture(() => response()); f.ready(); await f.search(); f.select();
  const reading = f.element("lyric-window");
  f.element("find-another-song").click(); const calls = reading.scrolls.length;
  f.players[0].position = 2; f.tick(); assert.equal(reading.scrolls.length, calls);
  f.element("return-to-practice").click(); f.tick();
  assert.equal(reading.scrolls.length, calls + 1);
  f.element("lyrics-panel-open").click(); f.players[0].position = 5; f.tick();
  assert.equal(reading.scrolls.length, calls + 1);
  f.element("lyrics-panel-close").click(); f.tick();
  assert.equal(reading.scrolls.length, calls + 2);
});


test("script labels use displayed lyrics and preserve mixed writing systems", async () => {
  const f = fixture(() => response([{ ...record, plainLyrics: "Only English", syncedLyrics: "[ar:English Artist]\n[00:02.00]안녕 Hello\n[00:05.00]踊る キミ écho" }]));
  f.ready(); await f.search();
  const label = f.element("lyrics-results").children[0].textContent;
  assert.match(label, /한글/); assert.match(label, /라틴 문자/);
  assert.match(label, /일본어/); assert.doesNotMatch(label, /가나|한자|\d+%/);
  assert.match(label, /안녕 Hello/);
  assert.doesNotMatch(label, /English Artist|Only English|영어 가사/);
  f.select();
  assert.match(f.element("lyrics-scripts").textContent, /한글/);
});

test("script labels handle decomposed Hangul, halfwidth kana, accents and unknown letters", async () => {
  const f = fixture(() => response([{ ...record, syncedLyrics: "", plainLyrics: "한 ｶﾅ café Ж مرحبا अ ไทย א Ω ሀ 🎵 123" }]));
  f.ready(); await f.search();
  const label = f.element("lyrics-results").children[0].textContent;
  for (const script of ["한글", "일본어", "라틴 문자", "키릴", "아랍", "데바나가리", "태국", "히브리", "그리스", "기타 문자"]) assert.ok(label.includes(script), script);
});

test("saved practice survives a new page and fetches the exact record with its signed offset", async () => {
  const storage = memoryStorage();
  const first = fixture(() => response(), "fixture-key", storage);
  first.ready(); await first.search(); first.select();
  first.element("lyrics-offset").value = "-2.5"; first.element("lyrics-offset").change();
  first.element("save-practice").click?.();
  assert.equal(storage.values.size, 1, "save writes device storage");
  const raw = [...storage.values.values()][0];
  assert.doesNotMatch(raw, /syncedLyrics|plainLyrics|First|fixture-key/);
  const second = fixture(() => response(record), "", storage);
  assert.equal(second.element("saved-practices").children.length, 1);
  assert.equal(second.players.length, 0, "no automatic playback on load");
  second.window.onYouTubeIframeAPIReady(); second.visibility(1);
  second.element("saved-practices").children[0].children[0].click();
  second.players[0].options.events.onReady();
  await vm.runInContext("lyricFinished", second.context);
  assert.equal(new URL(second.requests[0].url).pathname, "/api/get/42");
  assert.equal(second.players[0].options.videoId, "M7lc1UVf-VE");
  assert.equal(second.players[0].options.playerVars.autoplay, 0);
  assert.equal(second.element("lyrics-offset").value, "-2.5");
  second.players[0].position = 0; second.tick();
  assert.equal(second.currentLyric().textContent, "First");
});

test("save updates only its video and lyric pair and removal persists", async () => {
  const storage = memoryStorage();
  const f = fixture(() => response(), "fixture-key", storage);
  f.ready(); await f.search(); f.select(); f.element("save-practice").click?.();
  f.element("lyrics-later").click(); f.element("save-practice").click?.();
  assert.equal(f.element("saved-practices").children.length, 1);
  f.submit("dQw4w9WgXcQ"); f.players.at(-1).options.events.onReady();
  await f.search(); f.select(); f.element("save-practice").click();
  assert.equal(f.element("saved-practices").children.length, 2);
  f.element("saved-practices").children[0].children[1].click();
  const next = fixture(undefined, "", storage);
  assert.equal(next.element("saved-practices").children.length, 1);
});

test("storage failure never reports success and cannot block normal lyrics", async () => {
  const storage = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("quota"); } };
  const f = fixture(() => response(), "fixture-key", storage);
  f.ready(); await f.search(); f.select(); f.element("save-practice").click?.();
  assert.match(f.element("save-status").textContent, /저장하지 못/);
  f.players[0].position = 2; f.tick();
  assert.equal(f.currentLyric().textContent, "First");
  assert.equal(f.element("saved-practices").children.length, 0);
});

async function savedFixture(makeResponse) {
  const storage = memoryStorage();
  const f = fixture(() => response(), "fixture-key", storage);
  f.ready(); await f.search(); f.select(); f.element("save-practice").click?.();
  assert.equal(storage.values.size, 1);
  const next = fixture(makeResponse, "", storage);
  next.window.onYouTubeIframeAPIReady(); next.visibility(1);
  next.element("saved-practices").children[0].children[0].click();
  next.players[0].options.events.onReady();
  await Promise.resolve();
  return next;
}

test("missing or mismatched saved lyrics are not silently substituted", async () => {
  for (const make of [() => new Response("", { status: 404 }), () => response({ ...record, id: 43 }), () => response({ ...record, syncedLyrics: "bad", plainLyrics: "" })]) {
    const f = await savedFixture(make);
    await vm.runInContext("lyricFinished", f.context);
    assert.equal(vm.runInContext("selectedLyricRecord", f.context), null);
    assert.equal(f.element("lyrics-offset").value, "0");
    assert.ok(f.element("lyrics-status").textContent.length > 0);
    assert.equal(f.element("saved-practices").children.length, 1);
  }
});

test("stale saved lyric response cannot replace a newer video selection", async () => {
  let resolve;
  const f = await savedFixture(() => new Promise(r => { resolve = r; }));
  f.submit("dQw4w9WgXcQ"); f.players.at(-1).options.events.onReady();
  resolve(response(record)); await vm.runInContext("lyricFinished", f.context);
  assert.equal(vm.runInContext("selectedLyricRecord", f.context), null);
  assert.equal(f.requests[0].options.signal.aborted, true);
});


test("saving exposes unsaved timing changes instead of retaining a success message", async () => {
  const f = fixture(() => response());
  f.ready(); await f.search(); f.select(); f.element("save-practice").click();
  f.element("lyrics-later").click();
  assert.equal(f.element("save-status").textContent, "");
  assert.match(f.element("save-practice").textContent, /변경/);
});

test("kana prolonged marks do not create a spurious other-script label", async () => {
  const f = fixture(() => response([{ ...record, syncedLyrics: "", plainLyrics: "スーパー" }]));
  f.ready(); await f.search();
  assert.match(f.element("lyrics-results").children[0].textContent, /일본어/);
  assert.doesNotMatch(f.element("lyrics-results").children[0].textContent, /혼용|기타/);
});


test("corrupt or future storage stays untouched and does not prevent normal practice", async () => {
  for (const raw of ["{bad", JSON.stringify({ version: 2, items: [] }), JSON.stringify({ version: 1, items: [{ videoId: "bad" }] })]) {
    const storage = memoryStorage(); storage.setItem("singbridge.practice.v1", raw);
    const f = fixture(() => response(), "fixture-key", storage);
    assert.match(f.element("saved-status").textContent, /읽지 못/);
    f.ready(); await f.search(); f.select(); f.element("save-practice").click();
    assert.equal(storage.getItem("singbridge.practice.v1"), raw);
    assert.match(f.element("save-status").textContent, /저장하지 못/);
  }
});

test("full saved library rejects new entries without eviction but permits updates", async () => {
  const storage = memoryStorage();
  const f = fixture(() => response(), "fixture-key", storage);
  f.ready(); await f.search(); f.select(); f.element("save-practice").click();
  const data = JSON.parse(storage.getItem("singbridge.practice.v1"));
  const base = data.items[0];
  data.items = Array.from({ length: 20 }, (_, i) => ({ ...base, lyricId: 100 + i }));
  storage.setItem("singbridge.practice.v1", JSON.stringify(data));
  const full = fixture(() => response(), "fixture-key", storage);
  full.ready(); await full.search(); full.select(); full.element("save-practice").click();
  assert.match(full.element("save-status").textContent, /20개/);
  assert.equal(JSON.parse(storage.getItem("singbridge.practice.v1")).items.length, 20);
  assert.equal(JSON.parse(storage.getItem("singbridge.practice.v1")).items[0].lyricId, 100);
  const update = fixture(() => response([{ ...record, id: 100 }]), "fixture-key", storage);
  update.ready(); await update.search(); update.select(); update.element("lyrics-later").click(); update.element("save-practice").click();
  assert.equal(JSON.parse(storage.getItem("singbridge.practice.v1")).items.length, 20);
  assert.equal(JSON.parse(storage.getItem("singbridge.practice.v1")).items[0].offset, 0.5);
});

test("quota errors preserve the previously saved entry and removal failures remain visible", async () => {
  const storage = memoryStorage();
  const f = fixture(() => response(), "fixture-key", storage);
  f.ready(); await f.search(); f.select(); f.element("save-practice").click();
  const before = storage.getItem("singbridge.practice.v1");
  storage.setItem = () => { throw new Error("quota"); };
  f.element("lyrics-later").click(); f.element("save-practice").click();
  assert.equal(storage.getItem("singbridge.practice.v1"), before);
  assert.match(f.element("save-status").textContent, /저장하지 못/);
  f.element("saved-practices").children[0].children[1].click();
  assert.equal(f.element("saved-practices").children.length, 1);
  assert.match(f.element("saved-status").textContent, /삭제하지 못/);
});

test("saved restores honor retry backoff and never automatically retry", async () => {
  const f = await savedFixture(() => new Response("", { status: 429, headers: { "Retry-After": "120" } }));
  await vm.runInContext("lyricFinished", f.context);
  await f.search();
  assert.equal(f.requests.length, 1);
  assert.match(f.element("lyrics-status").textContent, /120초/);
  assert.equal(f.requests[0].options.signal.aborted, true);
});


test("Japanese display grouping does not label Han-only lyrics as Japanese", async () => {
  const f = fixture(() => response([{ ...record, syncedLyrics: "", plainLyrics: "春天 Hello" }]));
  f.ready(); await f.search();
  const label = f.element("lyrics-results").children[0].textContent;
  assert.match(label, /한자/); assert.match(label, /라틴 문자/);
  assert.doesNotMatch(label, /일본어|\d+%/);
});

test("Japanese kana and Han collapse into one display label while Latin stays visible", async () => {
  const f = fixture(() => response([{ ...record, syncedLyrics: "[00:02.00]明日の青い空 Hello", plainLyrics: "" }]));
  f.ready(); await f.search(); f.select();
  assert.equal(f.element("lyrics-scripts").textContent, "표기: 일본어 · 라틴 문자");
});


test('pronunciation validates exact source and rejects stale completion after reset', () => {
  const f = fixture();
  assert.equal(vm.runInContext("initialPronunciationTarget('ja-JP')", f.context), '');
  assert.equal(vm.runInContext("initialPronunciationTarget('ko-KR')", f.context), 'ko');
  assert.equal(vm.runInContext("initialPronunciationTarget('en-US')", f.context), 'en');
  vm.runInContext(`
    const req = { target: 'ko', lines: [{ id: 'line-0', text: '오늘 Hello' }] };
    const good = { target: 'ko', lines: [{ id: 'line-0', segments: [
      {source:'오늘 ',language:'ko',reading:null,pronunciation:null,needsReview:false},
      {source:'Hello',language:'en',reading:null,pronunciation:'헬로',needsReview:false}
    ] }] };
    validatePronunciation(req, good);
  `, f.context);
  assert.throws(() => vm.runInContext("good.lines[0].segments[0].source='변경'; validatePronunciation(req, good)", f.context));
  vm.runInContext("resetPronunciation(); window.singBridgePronunciationResult({id:'stale',result:good})", f.context);
  assert.equal(vm.runInContext('pronunciationResults.size', f.context), 0);
});

test('pronunciation keeps row identity, timing, offset and same-language text through hide/show', async () => {
  const f = fixture(() => response([{...record, syncedLyrics:'[00:02.00]오늘 Hello\n[00:05.00]First'}]));
  f.ready(); await f.search(); f.select();
  vm.runInContext("window.singBridgeConfigurePronunciation('ko-KR', true)", f.context);
  const sent = [];
  f.context.window.webkit = { messageHandlers: { pronunciation: { postMessage(message) { sent.push(message); } } } };
  f.element('lyrics-later').click();
  const rows = [...f.element('lyrics-timing').children];
  const pending = f.element('pronunciation-generate').click();
  const message = sent[0];
  assert.equal(message.request.target, 'ko');
  const result = {target:'ko',lines:message.request.lines.map(line => ({id:line.id,segments:[
    {source:line.text,language:line.text.startsWith('오늘')?'ko':'en',reading:null,pronunciation:line.text.startsWith('오늘')?null:'퍼스트',needsReview:false}
  ]}))};
  f.context.window.singBridgePronunciationResult({id:message.id,result}); await pending;
  assert.equal(f.element('lyrics-timing').children[0], rows[0]);
  assert.equal(f.element('lyrics-offset').value, '0.5');
  assert.match(rows[1].textContent, /First퍼스트/);
  f.element('pronunciation-toggle').click(); assert.equal(rows[1].textContent, 'First');
  f.element('pronunciation-toggle').click(); assert.match(rows[1].textContent, /퍼스트/);
  assert.equal(vm.runInContext('lyricLines[1].time',f.context),5);
});

test('target change cancels a pending conversion and ignores its late response', async () => {
  const f = fixture(() => response()); f.ready(); await f.search(); f.select();
  vm.runInContext("window.singBridgeConfigurePronunciation('ko', true)", f.context);
  const sent=[]; f.context.window.webkit={messageHandlers:{pronunciation:{postMessage:m=>sent.push(m)}}};
  const pending=f.element('pronunciation-generate').click();
  f.element('pronunciation-target').value='en'; f.element('pronunciation-target').change();
  f.context.window.singBridgePronunciationResult({id:sent[0].id,result:{}});
  await pending;
  assert.ok(sent.some(m=>m.cancel));
  assert.equal(vm.runInContext('pronunciationResults.size',f.context),0);
  assert.equal(f.element('pronunciation-generate').disabled,false);
  assert.equal(f.element('lyrics-timing').children[0].textContent,'First');
});

test('Android pronunciation port rejects a forged iframe port without its native nonce', () => {
  const f=fixture(); let started=0;
  f.context.window.message({data:'fake',ports:[{start(){started++}}]});
  assert.equal(started,0);
  f.context.window.singBridgePreparePronunciationPort('nonce');
  f.context.window.message({data:'wrong',ports:[{start(){started++}}]});
  assert.equal(started,0);
  f.context.window.message({data:'nonce',ports:[{start(){started++}}]});
  assert.equal(started,1);
});

test('replacing lyrics clears partial pronunciation and cancels the next batch', async () => {
  const large={...record,syncedLyrics:Array.from({length:13},(_,i)=>`[00:${String(i+1).padStart(2,'0')}.00]Hello ${i}`).join('\n')};
  const f=fixture(()=>response([large,{...record,id:43}])); f.ready(); await f.search(); f.select();
  vm.runInContext("window.singBridgeConfigurePronunciation('ko', true)",f.context);
  const sent=[]; f.context.window.webkit={messageHandlers:{pronunciation:{postMessage:m=>sent.push(m)}}};
  const pending=f.element('pronunciation-generate').click();
  const complete=m=>({id:m.id,result:{target:'ko',lines:m.request.lines.map(line=>({id:line.id,segments:[{source:line.text,language:'en',reading:null,pronunciation:'헬로',needsReview:false}]}))}});
  f.context.window.singBridgePronunciationResult(complete(sent[0]));
  await Promise.resolve();
  assert.equal(vm.runInContext('pronunciationResults.size',f.context),12);
  assert.equal(sent.length,2);
  f.select(1); f.context.window.singBridgePronunciationResult(complete(sent[1])); await pending;
  assert.ok(sent.some(m=>m.cancel));
  assert.equal(vm.runInContext('pronunciationResults.size',f.context),0);
  assert.equal(vm.runInContext('selectedLyricRecord.id',f.context),43);
  assert.equal(f.element('lyrics-timing').children[0].textContent,'First');
  assert.equal(vm.runInContext('lyricLines[0].time',f.context),2);
});

test('video replacement disables pronunciation until new timed lyrics are selected', async () => {
  const f=fixture(()=>response()); f.ready(); await f.search(); f.select();
  vm.runInContext("window.singBridgeConfigurePronunciation('ko', true)",f.context);
  assert.equal(f.element('pronunciation-generate').disabled,false);
  f.submit('dQw4w9WgXcQ');
  assert.equal(f.element('pronunciation-generate').disabled,true);
});


test('confident foreign pronunciation cannot be missing or blank', () => {
  const f=fixture();
  for (const pronunciation of [null, '   ']) {
    f.context.candidate={target:'ko',lines:[{id:'line-0',segments:[{source:'Hello',language:'en',reading:null,pronunciation,needsReview:false}]}]};
    assert.throws(()=>vm.runInContext("validatePronunciation({target:'ko',lines:[{id:'line-0',text:'Hello'}]}, candidate)",f.context));
  }
});

async function generatedPractice(storage = memoryStorage()) {
  const f = fixture(() => response(), 'fixture-key', storage);
  f.ready(); await f.search(); f.select();
  f.window.singBridgeConfigurePronunciation('ko', true);
  const sent = [];
  f.window.webkit = { messageHandlers: { pronunciation: { postMessage: m => sent.push(m) } } };
  const pending = f.element('pronunciation-generate').click();
  const message = sent[0];
  f.window.singBridgePronunciationResult({ id: message.id, result: { target: 'ko', lines: message.request.lines.map(line => ({
    id: line.id, segments: [{ source: line.text, language: 'en', reading: null, pronunciation: '테스트 발음', needsReview: false }]
  })) } });
  await pending;
  return f;
}

async function reopenPronunciation(storage, restoredRecord = record) {
  const f = fixture(() => response(restoredRecord), '', storage);
  f.window.singBridgeConfigurePronunciation('en', false);
  f.window.onYouTubeIframeAPIReady(); f.visibility(1);
  f.element('saved-practices').children[0].children[0].click();
  f.players[0].options.events.onReady();
  await vm.runInContext('lyricFinished', f.context);
  return f;
}

test('generic practice saves never persist unsaved pronunciation or edits', async () => {
  const storage = memoryStorage(); const f = await generatedPractice(storage);
  f.element('save-practice').click();
  let saved = JSON.parse(storage.getItem('singbridge.practice.v1')).items[0];
  assert.equal(saved.pronunciations, undefined, 'Reference save must not store generated lyrics');
  f.element('pronunciation-save').click();
  const original = JSON.stringify(JSON.parse(storage.getItem('singbridge.practice.v1')).items[0].pronunciations);
  f.element('pronunciation-edit-text').value = 'Unsaved draft'; f.element('pronunciation-edit-text').input();
  f.element('lyrics-later').click();
  assert.equal(f.element('save-practice').disabled, false);
  f.element('save-practice').click();
  saved = JSON.parse(storage.getItem('singbridge.practice.v1')).items[0];
  assert.equal(saved.offset, 0.5);
  assert.equal(JSON.stringify(saved.pronunciations), original, 'Timing save must retain the previously saved layer');
  f.element('pronunciation-edit-text').value = 'one\ntwo'; f.element('pronunciation-edit-text').input();
  f.element('lyrics-later').click();
  assert.equal(f.element('save-practice').disabled, false, 'Invalid pronunciation must not block a reference-only save');
  assert.equal(f.element('pronunciation-save').disabled, true);
  f.element('save-practice').click();
  saved = JSON.parse(storage.getItem('singbridge.practice.v1')).items[0];
  assert.equal(saved.offset, 1);
  assert.equal(JSON.stringify(saved.pronunciations), original);
});

test('saved pronunciation and line edits survive a new page without an AI bridge', async () => {
  const storage = memoryStorage();
  const first = await generatedPractice(storage);
  first.element('lyrics-offset').value = '5.5'; first.element('lyrics-offset').change();
  first.element('pronunciation-edit-line').value = 'line-0'; first.element('pronunciation-edit-line').change();
  first.element('pronunciation-edit-text').value = '내가 고친 발음'; first.element('pronunciation-edit-text').input();
  first.element('pronunciation-save').click();
  const second = await reopenPronunciation(storage);
  assert.equal(second.element('pronunciation-target').value, 'ko');
  assert.match(second.element('lyrics-timing').children[0].textContent, /내가 고친 발음.*직접 수정/);
  assert.equal(second.element('lyrics-offset').value, '5.5');
  assert.equal(second.element('pronunciation-generate').disabled, true);
  assert.match(second.element('pronunciation-status').textContent, /불러왔/);
  second.element('lyrics-later').click(); second.element('save-practice').click();
  const third = await reopenPronunciation(storage);
  assert.match(third.element('lyrics-timing').children[0].textContent, /내가 고친 발음/);
  assert.equal(third.element('lyrics-offset').value, '6');
});

test('changed lyric text or timestamps cannot receive saved pronunciation', async () => {
  const storage = memoryStorage(); const first = await generatedPractice(storage);
  first.element('pronunciation-save').click();
  for (const syncedLyrics of ['[00:02.00]Changed', record.syncedLyrics.replace('00:02', '00:03')]) {
    const next = await reopenPronunciation(storage, { ...record, syncedLyrics });
    assert.equal(vm.runInContext('pronunciationResults.size', next.context), 0);
    assert.match(next.element('pronunciation-status').textContent, /달라/);
  }
});

test('failed pronunciation save preserves stored result and keeps edits retryable', async () => {
  const storage = memoryStorage(); const f = await generatedPractice(storage);
  f.element('pronunciation-save').click();
  const before = storage.getItem('singbridge.practice.v1');
  f.element('pronunciation-edit-line').value = 'line-0'; f.element('pronunciation-edit-line').change();
  f.element('pronunciation-edit-text').value = '<b>edited</b>'; f.element('pronunciation-edit-text').input();
  storage.setItem = () => { throw new Error('Quota'); };
  f.element('pronunciation-save').click();
  assert.equal(storage.getItem('singbridge.practice.v1'), before);
  assert.match(f.element('pronunciation-status').textContent, /저장하지 못/);
  assert.match(f.element('lyrics-timing').children[0].textContent, /<b>edited<\/b>/);
  assert.equal(f.element('pronunciation-save').disabled, false);
  const next = await reopenPronunciation(storage);
  assert.doesNotMatch(next.element('lyrics-timing').children[0].textContent, /edited/);
});

test('invalid edits cannot alter rendered lines, timing, or either save action', async () => {
  const f = await generatedPractice();
  f.element('pronunciation-save').click();
  f.element('pronunciation-edit-line').value = 'line-0'; f.element('pronunciation-edit-line').change();
  const times = vm.runInContext('JSON.stringify(lyricLines)', f.context);
  for (const invalid of ['', '   ', 'one\ntwo', 'one\rtwo', 'one\u2028two', 'one\u2029two', 'one\u0000two', 'one\u202Etwo', '가'.repeat(2001)]) {
    f.element('pronunciation-edit-text').value = invalid; f.element('pronunciation-edit-text').input();
    assert.equal(f.element('pronunciation-save').disabled, true, JSON.stringify(invalid.slice(0, 30)));
    assert.equal(f.element('save-practice').disabled, true);
    assert.equal(f.element('lyrics-timing').children[0].children[0].textContent, '테스트 발음');
    assert.equal(vm.runInContext('JSON.stringify(lyricLines)', f.context), times);
  }
  f.element('pronunciation-edit-text').value = '가'.repeat(2000); f.element('pronunciation-edit-text').input();
  assert.equal(f.element('pronunciation-save').disabled, false);
  f.element('pronunciation-edit-reset').click();
  assert.equal(f.element('pronunciation-edit-text').value, '테스트 발음');
  assert.doesNotMatch(f.element('lyrics-timing').children[0].textContent, /직접 수정/);
});

test('tampered stored edits and mappings cannot replace valid source or execute markup', async () => {
  const storage = memoryStorage(); const f = await generatedPractice(storage); f.element('pronunciation-save').click();
  const good = storage.getItem('singbridge.practice.v1');
  const changes = [
    d => { d.edits['line-0'] = 'one\ntwo'; },
    d => { d.edits['line-99'] = 'wrong line'; },
    d => { d.lines[0].segments[0].source = 'changed'; },
    d => { d.lines.push(d.lines[0]); },
    d => { d.source[0].time = -1; },
    d => { d.target = 'xx'; },
    d => { d.edits['line-0'] = '가'.repeat(2001); },
  ];
  for (const mutate of changes) {
    const data = JSON.parse(good); mutate(data.items[0].pronunciations.ko);
    const raw = JSON.stringify(data); storage.setItem('singbridge.practice.v1', raw);
    const next = fixture(() => response(), '', storage);
    assert.match(next.element('saved-status').textContent, /읽지 못/);
    assert.equal(storage.getItem('singbridge.practice.v1'), raw, 'Never overwrite corrupted storage');
    next.ready(); await next.search(); next.select();
    assert.equal(next.element('lyrics-timing').children[0].textContent, 'First');
  }
});

test('target switching restores the matching saved layer and keeps user edits separate', async () => {
  const storage = memoryStorage(); const f = await generatedPractice(storage); f.element('pronunciation-save').click();
  f.element('pronunciation-target').value = 'en'; f.element('pronunciation-target').change();
  assert.equal(vm.runInContext('pronunciationResults.size', f.context), 0);
  f.element('pronunciation-target').value = 'ko'; f.element('pronunciation-target').change();
  assert.match(f.element('lyrics-timing').children[0].textContent, /테스트 발음/);
  f.element('pronunciation-edit-text').value = '첫째 줄 수정'; f.element('pronunciation-edit-text').input();
  f.element('pronunciation-edit-line').value = 'line-1'; f.element('pronunciation-edit-line').change();
  assert.equal(f.element('pronunciation-edit-text').value, '테스트 발음');
  f.element('pronunciation-edit-text').value = '둘째 줄 수정'; f.element('pronunciation-edit-text').input();
  f.element('pronunciation-save').click();
  const next = await reopenPronunciation(storage);
  assert.match(next.element('lyrics-timing').children[0].textContent, /첫째 줄 수정/);
  assert.match(next.element('lyrics-timing').children[1].textContent, /둘째 줄 수정/);
});

test('timestamp-like and markup-like edits stay literal and never enter the LRC parser', async () => {
  const storage = memoryStorage(); const f = await generatedPractice(storage);
  const original = vm.runInContext('JSON.stringify(lyricLines)', f.context);
  f.element('pronunciation-edit-text').value = '[99:59.99]<script>wrong()</script>';
  f.element('pronunciation-edit-text').input(); f.element('pronunciation-save').click();
  const next = await reopenPronunciation(storage);
  assert.equal(vm.runInContext('JSON.stringify(lyricLines)', next.context), original);
  assert.equal(next.element('lyrics-timing').children.length, f.element('lyrics-timing').children.length);
  assert.equal(next.element('lyrics-timing').children[0].children[0].textContent, '[99:59.99]<script>wrong()</script>');
});

test('lyric activation seeks with the signed offset and starts playback without changing lyrics', async () => {
  const f = await generatedPractice(); const p = f.players[0];
  const source = vm.runInContext('JSON.stringify(lyricLines)', f.context);
  const row = f.element('lyrics-timing').children[0];
  assert.equal(row.tagName, 'BUTTON');
  for (const [offset, expected] of [[0, 2], [5.5, 7.5], [-1, 1], [-5, 0]]) {
    f.element('lyrics-offset').value = String(offset); f.element('lyrics-offset').change();
    const plays = p.plays || 0;
    row.click?.({ detail: 0 });
    assert.deepEqual(p.seek, [expected, true]);
    assert.equal(p.plays, plays + 1);
    assert.equal(f.element('lyrics-offset').value, String(offset));
    assert.equal(vm.runInContext('JSON.stringify(lyricLines)', f.context), source);
  }
  f.element('pronunciation-toggle').click(); f.element('pronunciation-toggle').click();
  row.click({ detail: 0 });
  assert.match(row.textContent, /테스트 발음/);
  assert.deepEqual(p.seek, [0, true]);
});

test('lyric activation rejects hidden, unready, invalid-duration and out-of-range playback', async () => {
  const cases = [
    f => f.visibility(0), f => { f.document.hidden = true; },
    f => vm.runInContext('foreground = false', f.context),
    f => { f.element('practice-screen').hidden = true; },
    f => { f.element('lyrics-panel').open = true; },
    f => vm.runInContext('ready = false', f.context),
    f => { f.players[0].duration = NaN; }, f => { f.players[0].duration = 0; },
    f => { f.players[0].duration = 2; },
    f => { f.element('lyrics-offset').value = '100'; f.element('lyrics-offset').change(); },
  ];
  for (const disable of cases) {
    const f = fixture(() => response()); f.ready(); await f.search(); f.select();
    const row = f.element('lyrics-timing').children[0]; disable(f);
    row.click?.({ detail: 0 });
    assert.equal(f.players[0].seek, undefined);
    assert.equal(f.players[0].plays, undefined);
  }
});

test('lyric drag, scrolling, and pointer cancellation cannot seek but the next tap can', async () => {
  const f = fixture(() => response()); f.ready(); await f.search(); f.select();
  const reading = f.element('lyric-window'), row = f.element('lyrics-timing').children[0], p = f.players[0];
  const down = { pointerId: 1, clientX: 40, clientY: 40 };
  for (const gesture of [
    () => f.window.pointermove?.({ ...down, clientY: 60 }),
    () => { reading.scrollTop += 20; reading.scroll?.(); },
    () => f.window.pointercancel(down),
  ]) {
    reading.pointerdown(down); gesture(); f.window.pointerup(down); row.click?.({ detail: 1 });
    assert.equal(p.seek, undefined);
  }
  reading.pointerdown(down); f.window.pointerup(down); row.click?.({ detail: 1 });
  assert.deepEqual(p.seek, [2, true]);
  assert.equal(p.plays, 1);
  f.tick(); assert.equal(f.currentLyric(), row);
});

test('blank markers and obsolete lyric rows never seek', async () => {
  const f = fixture(() => response()); f.ready(); await f.search(); f.select();
  const [row, , blank] = f.element('lyrics-timing').children;
  assert.notEqual(blank.tagName, 'BUTTON'); blank.click?.({ detail: 0 });
  vm.runInContext('renderTimedLyrics()', f.context);
  row.click?.({ detail: 0 });
  assert.equal(f.players[0].seek, undefined);
  f.element('lyrics-timing').children[0].click?.({ detail: 0 });
  assert.deepEqual(f.players[0].seek, [2, true]);
});

test('lyric seek following waits for the real player position', async () => {
  const f = fixture(() => response()); f.ready(); await f.search(); f.select();
  const p = f.players[0]; p.position = 2; f.tick();
  const first = f.currentLyric();
  p.seekTo = function(value, ahead) { this.seek = [value, ahead]; };
  f.element('lyrics-timing').children[1].click?.({ detail: 0 });
  assert.deepEqual(p.seek, [5, true]);
  f.tick(); assert.equal(f.currentLyric(), first);
  p.position = 5; f.tick(); assert.equal(f.currentLyric().textContent, 'Second');
});
