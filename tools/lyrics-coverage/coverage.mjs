// Measures LRCLIB synced-lyric coverage for a curated song list the way the app searches.
// The report keeps provider metadata only; lyric text is read to classify a record and never written out.
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
  realpathSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEARCH_URL = 'https://lrclib.net/api/search';
const CLIENT =
  'SingBridge/0.1 (https://github.com/AndrewDongminYoo/sing_bridge)';
const MAX_RESPONSE_BYTES = 4 * 1048576;
const DISPLAYED_CANDIDATES = 20;
const REPORTED_CANDIDATES = 5;
const DURATION_TOLERANCE_SECONDS = 2;
const MAX_SONGS = 100;
const MAX_QUERY_LENGTH = 120;
const STATUSES = [
  'synced',
  'synced-other-duration',
  'plain-only',
  'none',
  'error',
];

export function parseSongs(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SONGS) {
    throw new Error(
      `The song list must be an array of 1 to ${MAX_SONGS} songs.`,
    );
  }
  return value.map((song, index) => {
    const artist = typeof song?.artist === 'string' ? song.artist.trim() : '';
    const title = typeof song?.title === 'string' ? song.title.trim() : '';
    const duration = song?.durationSeconds ?? null;
    // The app accepts "artist - title" up to 120 characters.
    if (
      !artist ||
      !title ||
      artist.length + title.length + 3 > MAX_QUERY_LENGTH
    ) {
      throw new Error(
        `Song list entry ${index} needs an artist and title within ${MAX_QUERY_LENGTH} characters.`,
      );
    }
    if (duration !== null && (!Number.isFinite(duration) || duration <= 0)) {
      throw new Error(
        `Song list entry ${index} has an invalid durationSeconds.`,
      );
    }
    return { artist, title, durationSeconds: duration };
  });
}

// Mirrors normalizeLyricRecord in YouTubeLyrics.kt.
function normalize(item) {
  if (!item || !Number.isSafeInteger(item.id) || item.id <= 0) return null;
  if (typeof item.trackName !== 'string' || typeof item.artistName !== 'string')
    return null;
  const instrumental = item.instrumental === true;
  const hasSynced =
    typeof item.syncedLyrics === 'string' && item.syncedLyrics.trim() !== '';
  const hasPlain =
    typeof item.plainLyrics === 'string' && item.plainLyrics.trim() !== '';
  return {
    id: item.id,
    trackName: item.trackName.slice(0, 500),
    artistName: item.artistName.slice(0, 500),
    albumName:
      typeof item.albumName === 'string' ? item.albumName.slice(0, 500) : '',
    duration:
      Number.isFinite(item.duration) && item.duration > 0
        ? item.duration
        : null,
    type: instrumental
      ? 'instrumental'
      : hasSynced
        ? 'synced'
        : hasPlain
          ? 'plain'
          : 'none',
  };
}

export function classify(records, expectedDuration) {
  const candidates = (Array.isArray(records) ? records : [])
    .map(normalize)
    .filter(Boolean);
  const difference = (candidate) =>
    expectedDuration && candidate.duration !== null
      ? Math.abs(candidate.duration - expectedDuration)
      : null;
  const distance = (candidate) => difference(candidate) ?? Infinity;
  // Like renderLyricCandidates: rank by duration distance when the video length is known, then show 20.
  const ranked = expectedDuration
    ? [...candidates].sort((a, b) => distance(a) - distance(b))
    : candidates;
  const displayed = ranked.slice(0, DISPLAYED_CANDIDATES).map((candidate) => ({
    ...candidate,
    durationDifference:
      difference(candidate) === null
        ? null
        : Number(difference(candidate).toFixed(1)),
  }));
  const syncedCandidates = displayed.filter(
    (candidate) => candidate.type === 'synced',
  );
  // Compare the raw difference; durationDifference is rounded for the report only.
  const match = syncedCandidates.find((candidate) =>
    difference(candidate) === null
      ? !expectedDuration
      : difference(candidate) <= DURATION_TOLERANCE_SECONDS,
  );
  const status = match
    ? 'synced'
    : syncedCandidates.length
      ? 'synced-other-duration'
      : displayed.some((candidate) => candidate.type === 'plain')
        ? 'plain-only'
        : 'none';
  return {
    status,
    match: match ?? null,
    candidateCount: candidates.length,
    candidates: displayed.slice(0, REPORTED_CANDIDATES),
  };
}

async function readBoundedJson(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_RESPONSE_BYTES)
        throw new Error('LRCLIB response too large');
      text += decoder.decode(chunk.value, { stream: true });
    }
    try {
      return JSON.parse(text + decoder.decode());
    } catch {
      // Parser messages can quote the input, which may contain lyrics.
      throw new Error('LRCLIB returned invalid JSON');
    }
  } finally {
    await reader.cancel();
  }
}

// LRCLIB rate limits the client, not one song. A measurement run has no reason to wait
// it out, so the first 429 ends the run and the remaining songs are not requested.
class RateLimitError extends Error {}

// Discarding an unused body is best effort; a failure must not change how the response is classified.
async function discard(response) {
  try {
    await response.body?.cancel();
  } catch {
    // Ignore: the status code already decided the outcome.
  }
}

async function search(song, fetcher) {
  const url = new URL(SEARCH_URL);
  url.searchParams.set('q', song.artist + ' ' + song.title);
  const response = await fetcher(url.toString(), {
    headers: { 'Lrclib-Client': CLIENT },
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 429) {
    await discard(response);
    throw new RateLimitError('LRCLIB rate limited the run (HTTP 429)');
  }
  if (!response.ok) {
    await discard(response);
    throw new Error(`LRCLIB HTTP ${response.status}`);
  }
  const records = await readBoundedJson(response);
  if (!Array.isArray(records))
    throw new Error('LRCLIB returned a non-array response');
  return records;
}

export async function measure(
  songs,
  {
    fetcher = fetch,
    delayMs = 1000,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = {},
) {
  const results = [];
  const failed = (song, message) => ({
    ...song,
    status: 'error',
    error: message,
    match: null,
    candidateCount: 0,
    candidates: [],
  });
  let rateLimited = null;
  for (const [index, song] of songs.entries()) {
    if (rateLimited) {
      results.push(
        failed(song, `not requested after rate limit: ${rateLimited}`),
      );
      continue;
    }
    if (index > 0 && delayMs > 0) await sleep(delayMs);
    try {
      results.push({
        ...song,
        ...classify(await search(song, fetcher), song.durationSeconds),
      });
    } catch (error) {
      if (error instanceof RateLimitError) rateLimited = error.message;
      results.push(failed(song, error.message));
    }
  }
  const summary = { total: results.length };
  summary.measured = results.filter(
    (result) => result.status !== 'error',
  ).length;
  for (const status of STATUSES)
    summary[status] = results.filter(
      (result) => result.status === status,
    ).length;
  summary.syncedRatio = summary.measured
    ? Number((summary.synced / summary.measured).toFixed(3))
    : null;
  return {
    source: SEARCH_URL,
    toleranceSeconds: DURATION_TOLERANCE_SECONDS,
    summary,
    songs: results,
  };
}

export async function main(argv, { fetcher = fetch } = {}) {
  const [listPath, ...options] = argv;
  let delayMs = 1000;
  let outPath = null;
  for (let index = 0; index < options.length; index += 2) {
    const [option, value] = [options[index], options[index + 1]];
    if (option !== '--delay-ms' && option !== '--out') {
      throw new Error(`Unknown option ${option}`);
    }
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${option} needs a value`);
    }
    if (option === '--delay-ms') delayMs = Number(value);
    else outPath = value;
  }
  if (!listPath)
    throw new Error(
      'Usage: node tools/lyrics-coverage/coverage.mjs <song list.json> [--delay-ms N] [--out report.json]',
    );
  if (!Number.isFinite(delayMs) || delayMs < 0)
    throw new Error('--delay-ms must be a non-negative number');
  const songs = parseSongs(JSON.parse(readFileSync(listPath, 'utf8')));
  // Open the report before any request, so an unwritable path fails without spending requests.
  let out = null;
  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true });
    out = openSync(outPath, 'w');
  }
  try {
    const report = {
      measuredAt: new Date().toISOString(),
      ...(await measure(songs, { fetcher, delayMs })),
    };
    const text = JSON.stringify(report, null, 2) + '\n';
    if (out !== null) writeFileSync(out, text);
    else process.stdout.write(text);
  } finally {
    if (out !== null) closeSync(out);
  }
}

// Compare resolved paths so a symlinked command still runs.
if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(error.message + '\n');
    process.exitCode = 2;
  });
}
