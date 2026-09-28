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

function fixture(respond = async () => new Response("[]"), apiKey = "fixture-key") {
  const elements = new Map();
  function node() {
    return {
      value: "",
      textContent: "",
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
        this.children = children;
      },
      append(...children) {
        this.children.push(...children);
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
  const window = {};
  const requests = [];
  let now = 1700000000000;
  let intersection;
  const context = vm.createContext({
    document,
    window,
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
  vm.runInContext(lyricsScript, context);
  vm.runInContext(script, context);
  return {
    context,
    element,
    window,
    document,
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
  assert.equal(f.element("lyric-current").textContent, "");
  f.select();
  f.players[0].position = 2;
  f.tick();
  assert.equal(f.element("lyric-current").textContent, "First");
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
    assert.equal(f.element("lyric-current").textContent, expected);
  }
  f.element("lyrics-offset").value = "2";
  f.element("lyrics-offset").change();
  f.players[0].position = 3;
  f.tick();
  assert.equal(f.element("lyric-current").textContent, "");
  f.players[0].position = 4;
  f.tick();
  assert.equal(f.element("lyric-current").textContent, "First");
  f.element("lyrics-offset").value = "-1";
  f.element("lyrics-offset").change();
  f.players[0].position = 4;
  f.tick();
  assert.equal(f.element("lyric-current").textContent, "Second");
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
  assert.equal(f.element("lyric-current").textContent, "");
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
  assert.equal(f.element("lyric-current").textContent, "Echo\nHarmony");
  f.players[0].position = 6;
  f.tick();
  assert.equal(f.element("lyric-current").textContent, "Echo");
  const bad = fixture(() =>
    response([{ ...record, syncedLyrics: "[offset:100]\n[00:02.00]Line", plainLyrics: null }])
  );
  bad.ready();
  await bad.search();
  bad.select();
  assert.match(bad.element("lyrics-status").textContent, /offset/);
  assert.equal(bad.element("lyric-current").textContent, "");
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
  assert.equal(f.element("lyric-current").textContent, "First");
  f.submit("dQw4w9WgXcQ");
  assert.equal(f.element("lyric-current").textContent, "");
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

test("a new lyric resets its internal scroll while polling the same lyric preserves it", async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  f.players[0].position = 2;
  f.tick();
  const current = f.element("lyric-current");
  current.scrollTop = 24;
  f.tick();
  assert.equal(current.scrollTop, 24);
  f.players[0].position = 5;
  f.tick();
  assert.equal(current.textContent, "Second");
  assert.equal(current.scrollTop, 0);
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
  assert.match(names[1], /차이 1초/);
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

test("offset buttons adjust lyric timing without seeking and reset to the original timestamps", async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  f.players[0].position = 1.75;
  f.tick();
  assert.equal(f.element("lyric-current").textContent, "");
  f.element("lyrics-earlier").click();
  assert.equal(f.element("lyrics-offset").value, "-0.5");
  assert.equal(f.element("lyric-current").textContent, "First");
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

test("new lyrics reset the shared reading area scroll without moving the controls", async () => {
  const f = fixture(() => response());
  f.ready();
  await f.search();
  f.select();
  f.players[0].position = 2;
  f.tick();
  f.element("lyric-window").scrollTop = 100;
  f.tick();
  assert.equal(f.element("lyric-window").scrollTop, 100);
  f.players[0].position = 5;
  f.tick();
  assert.equal(f.element("lyric-window").scrollTop, 0);
});
