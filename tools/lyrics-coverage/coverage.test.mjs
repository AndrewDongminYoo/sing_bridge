import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { classify, main, measure, parseSongs } from './coverage.mjs';

const LYRIC_SENTINEL = 'private-lyric-sentinel';
const record = (id, fields = {}) => ({
  id,
  trackName: 'Track ' + id,
  artistName: 'Artist',
  albumName: 'Album',
  duration: 200,
  instrumental: false,
  syncedLyrics: '',
  plainLyrics: '',
  ...fields,
});
const synced = '[00:01.00] ' + LYRIC_SENTINEL;
const plain = LYRIC_SENTINEL;

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), { status: 200, ...init });
}

test('uses the app query shape and client identification', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url: new URL(url), headers: options.headers });
    return jsonResponse([]);
  };
  await measure([{ artist: 'Vaundy', title: '踊り子', durationSeconds: 246 }], {
    fetcher,
    delayMs: 0,
  });
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url.origin + calls[0].url.pathname,
    'https://lrclib.net/api/search',
  );
  assert.equal(calls[0].url.searchParams.get('q'), 'Vaundy 踊り子');
  assert.match(calls[0].headers['Lrclib-Client'], /^SingBridge\//);
});

test('classifies synced lyrics within the duration tolerance', () => {
  const result = classify(
    [
      record(1, { duration: 230, syncedLyrics: synced }),
      record(2, { duration: 201.5, syncedLyrics: synced }),
    ],
    200,
  );
  assert.equal(result.status, 'synced');
  assert.equal(result.match.id, 2);
  assert.equal(result.match.durationDifference, 1.5);
});

test('separates synced lyrics for another duration from a match', () => {
  const result = classify(
    [record(1, { duration: 230, syncedLyrics: synced })],
    200,
  );
  assert.equal(result.status, 'synced-other-duration');
  assert.equal(result.match, null);
});

test('accepts any synced record when the expected duration is unknown', () => {
  const result = classify(
    [record(1, { duration: 230, syncedLyrics: synced })],
    null,
  );
  assert.equal(result.status, 'synced');
  assert.equal(result.match.durationDifference, null);
});

test('reports plain-only, instrumental, and empty results', () => {
  assert.equal(
    classify([record(1, { plainLyrics: plain })], 200).status,
    'plain-only',
  );
  assert.equal(
    classify([record(1, { instrumental: true, syncedLyrics: synced })], 200)
      .status,
    'none',
  );
  assert.equal(classify([], 200).status, 'none');
});

test('only considers the 20 candidates the app displays, ranked by duration', () => {
  const far = Array.from({ length: 20 }, (_, index) =>
    record(index + 1, { duration: 150 + index }),
  );
  const hidden = record(99, { duration: 400, syncedLyrics: synced });
  const result = classify([hidden, ...far], 180);
  assert.equal(result.status, 'none');
  assert.equal(result.candidates.length, 5);
  assert.deepEqual(
    result.candidates.map((candidate) => candidate.id),
    [20, 19, 18, 17, 16],
  );
});

test('drops malformed records the app would also drop', () => {
  const result = classify(
    [
      { id: 'x', trackName: 'T', artistName: 'A', syncedLyrics: synced },
      record(0, { syncedLyrics: synced }),
      record(3, { artistName: 7, syncedLyrics: synced }),
      record(4, { plainLyrics: plain }),
    ],
    200,
  );
  assert.equal(result.status, 'plain-only');
  assert.equal(result.candidateCount, 1);
  assert.deepEqual(
    result.candidates.map((candidate) => candidate.id),
    [4],
  );
});

test('never writes lyric text into the report', async () => {
  const fetcher = async () =>
    jsonResponse([
      record(1, { syncedLyrics: synced, plainLyrics: plain }),
      record(2, { plainLyrics: plain }),
    ]);
  const report = await measure(
    [{ artist: 'A', title: 'B', durationSeconds: 200 }],
    {
      fetcher,
      delayMs: 0,
    },
  );
  assert.equal(report.songs[0].status, 'synced');
  assert.ok(!JSON.stringify(report).includes(LYRIC_SENTINEL));
});

test('summarizes coverage over measured songs, excluding errors', async () => {
  const responses = [
    jsonResponse([record(1, { syncedLyrics: synced })]),
    jsonResponse([record(2, { plainLyrics: plain })]),
    new Response('unavailable', { status: 503 }),
  ];
  const report = await measure(
    [
      { artist: 'A', title: 'One', durationSeconds: 200 },
      { artist: 'A', title: 'Two', durationSeconds: 200 },
      { artist: 'A', title: 'Three', durationSeconds: 200 },
    ],
    { fetcher: async () => responses.shift(), delayMs: 0 },
  );
  assert.deepEqual(report.summary, {
    total: 3,
    measured: 2,
    synced: 1,
    'synced-other-duration': 0,
    'plain-only': 1,
    none: 0,
    error: 1,
    syncedRatio: 0.5,
  });
  assert.match(report.songs[2].error, /HTTP 503/);
});

test('requests songs sequentially with the configured delay', async () => {
  const events = [];
  let active = 0;
  const fetcher = async () => {
    active += 1;
    assert.equal(active, 1);
    events.push('fetch');
    await new Promise((resolve) => setImmediate(resolve));
    active -= 1;
    return jsonResponse([]);
  };
  await measure(
    [
      { artist: 'A', title: 'One', durationSeconds: 200 },
      { artist: 'A', title: 'Two', durationSeconds: 200 },
    ],
    { fetcher, delayMs: 250, sleep: async (ms) => events.push('sleep ' + ms) },
  );
  assert.deepEqual(events, ['fetch', 'sleep 250', 'fetch']);
});

test('rejects oversized responses', async () => {
  const fetcher = async () => new Response('x'.repeat(4 * 1048576 + 1));
  const report = await measure(
    [{ artist: 'A', title: 'B', durationSeconds: 200 }],
    {
      fetcher,
      delayMs: 0,
    },
  );
  assert.equal(report.songs[0].status, 'error');
  assert.match(report.songs[0].error, /too large/);
});

test('validates the song list against the app search limits', () => {
  assert.deepEqual(
    parseSongs([{ artist: 'Vaundy', title: '踊り子', durationSeconds: 246 }]),
    [{ artist: 'Vaundy', title: '踊り子', durationSeconds: 246 }],
  );
  assert.deepEqual(parseSongs([{ artist: 'A', title: 'B' }]), [
    { artist: 'A', title: 'B', durationSeconds: null },
  ]);
  for (const invalid of [
    [],
    {},
    [{ artist: '', title: 'B' }],
    [{ artist: 'A', title: 'B', durationSeconds: -1 }],
    [{ artist: 'A'.repeat(60), title: 'B'.repeat(60) }],
    Array.from({ length: 101 }, () => ({ artist: 'A', title: 'B' })),
  ]) {
    assert.throws(() => parseSongs(invalid), /song list/i);
  }
});

test('the CLI reports invalid input without a network request', () => {
  const directory = mkdtempSync(join(tmpdir(), 'singbridge-coverage-'));
  try {
    const list = join(directory, 'songs.json');
    writeFileSync(list, '[]');
    const child = spawnSync(
      process.execPath,
      [new URL('./coverage.mjs', import.meta.url).pathname, list],
      { encoding: 'utf8' },
    );
    assert.equal(child.status, 2);
    assert.match(child.stderr, /song list/i);
    assert.equal(child.stdout, '');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('compares the unrounded difference with the tolerance', () => {
  const result = classify(
    [record(1, { duration: 202.04, syncedLyrics: synced })],
    200,
  );
  assert.equal(result.status, 'synced-other-duration');
  assert.equal(result.candidates[0].durationDifference, 2);
});

test('reports malformed JSON without quoting the response', async () => {
  const fetcher = async () =>
    new Response('[{"syncedLyrics": "' + LYRIC_SENTINEL + '" oops');
  const report = await measure(
    [{ artist: 'A', title: 'B', durationSeconds: 200 }],
    { fetcher, delayMs: 0 },
  );
  assert.equal(report.songs[0].status, 'error');
  assert.equal(report.songs[0].error, 'LRCLIB returned invalid JSON');
  assert.ok(!JSON.stringify(report).includes(LYRIC_SENTINEL));
});

test('creates the output directory for the report', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'singbridge-coverage-'));
  try {
    const list = join(directory, 'songs.json');
    const out = join(directory, 'build', 'nested', 'report.json');
    writeFileSync(
      list,
      JSON.stringify([{ artist: 'A', title: 'B', durationSeconds: 200 }]),
    );
    await main([list, '--delay-ms', '0', '--out', out], {
      fetcher: async () => jsonResponse([record(1, { syncedLyrics: synced })]),
    });
    assert.equal(JSON.parse(readFileSync(out, 'utf8')).summary.synced, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('the CLI rejects an option without a value before any request', () => {
  const directory = mkdtempSync(join(tmpdir(), 'singbridge-coverage-'));
  try {
    const list = join(directory, 'songs.json');
    writeFileSync(
      list,
      JSON.stringify([{ artist: 'A', title: 'B', durationSeconds: 200 }]),
    );
    for (const options of [
      ['--out'],
      ['--delay-ms'],
      ['--out', '--delay-ms', '0'],
    ]) {
      const child = spawnSync(
        process.execPath,
        [new URL('./coverage.mjs', import.meta.url).pathname, list, ...options],
        { encoding: 'utf8' },
      );
      assert.equal(child.status, 2, options.join(' '));
      assert.match(child.stderr, /needs a value/);
      assert.equal(child.stdout, '');
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('ends the run on the first 429 without waiting or retrying', async () => {
  for (const retryAfter of ['3', '600', '9'.repeat(400), null]) {
    let calls = 0;
    const waits = [];
    const fetcher = async () => {
      calls += 1;
      return new Response('', {
        status: 429,
        headers: retryAfter === null ? {} : { 'Retry-After': retryAfter },
      });
    };
    const report = await measure(
      [
        { artist: 'A', title: 'One', durationSeconds: 200 },
        { artist: 'A', title: 'Two', durationSeconds: 200 },
      ],
      { fetcher, delayMs: 1000, sleep: async (ms) => waits.push(ms) },
    );
    assert.equal(calls, 1, String(retryAfter));
    assert.deepEqual(waits, []);
    assert.deepEqual(
      report.songs.map((song) => song.status),
      ['error', 'error'],
    );
    assert.match(report.songs[0].error, /rate limited/);
    assert.match(report.songs[1].error, /not requested/);
  }
});

test('fails on an unwritable --out before any request', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'singbridge-coverage-'));
  try {
    const list = join(directory, 'songs.json');
    writeFileSync(
      list,
      JSON.stringify([{ artist: 'A', title: 'B', durationSeconds: 200 }]),
    );
    let calls = 0;
    await assert.rejects(
      main([list, '--delay-ms', '0', '--out', directory], {
        fetcher: async () => {
          calls += 1;
          return jsonResponse([]);
        },
      }),
      /EISDIR/,
    );
    assert.equal(calls, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('still ends the run when discarding a 429 body fails', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    const body = new ReadableStream({
      cancel() {
        throw new Error('stream broke');
      },
    });
    return new Response(body, { status: 429 });
  };
  const report = await measure(
    [
      { artist: 'A', title: 'One', durationSeconds: 200 },
      { artist: 'A', title: 'Two', durationSeconds: 200 },
    ],
    { fetcher, delayMs: 0 },
  );
  assert.equal(calls, 1);
  assert.match(report.songs[0].error, /rate limited/);
  assert.match(report.songs[1].error, /not requested/);
});

test('the CLI runs when invoked through a symlink', () => {
  const directory = mkdtempSync(join(tmpdir(), 'singbridge-coverage-'));
  try {
    const list = join(directory, 'songs.json');
    const link = join(directory, 'coverage-link.mjs');
    writeFileSync(list, '[]');
    symlinkSync(
      fileURLToPath(new URL('./coverage.mjs', import.meta.url)),
      link,
    );
    const child = spawnSync(process.execPath, [link, list], {
      encoding: 'utf8',
    });
    assert.equal(child.status, 2);
    assert.match(child.stderr, /song list/i);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
