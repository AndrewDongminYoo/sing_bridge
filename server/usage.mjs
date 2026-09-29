import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { model } from './pronunciation.mjs';

// Records hold counts and page request IDs only: never lyric text, credentials or video IDs.
export const usageDirectory = new URL(
  './build/pronunciation-usage/',
  import.meta.url,
);
const count = (value) =>
  Number.isSafeInteger(value) && value >= 0 ? value : null;
export function usageRecord(sequence, requestId, request, usage, ok) {
  return {
    sequence,
    requestId:
      typeof requestId === 'string' &&
      requestId.length <= 40 &&
      /^[0-9]+-[0-9]+$/.test(requestId)
        ? requestId
        : null,
    model,
    target: request.target,
    lines: request.lines.length,
    inputTokens: count(usage.input_tokens),
    cachedInputTokens: count(usage.input_tokens_details?.cached_tokens),
    outputTokens: count(usage.output_tokens),
    reasoningTokens: count(usage.output_tokens_details?.reasoning_tokens),
    ok,
  };
}
export function usageLog(file) {
  let warned = false;
  return (record) => {
    try {
      mkdirSync(dirname(fileURLToPath(file)), { recursive: true });
      appendFileSync(file, JSON.stringify(record) + '\n');
    } catch {
      if (!warned) console.error('Unable to write pronunciation usage record.');
      warned = true;
    }
  };
}
const fields = [
  'lines',
  'inputTokens',
  'cachedInputTokens',
  'outputTokens',
  'reasoningTokens',
];
function add(sum, record) {
  sum.requests++;
  if (!record.ok) sum.failed++;
  if (record.inputTokens === null || record.outputTokens === null)
    sum.missing++;
  for (const field of fields) sum[field] += record[field] ?? 0;
}
const empty = () => ({
  requests: 0,
  failed: 0,
  missing: 0,
  ...Object.fromEntries(fields.map((field) => [field, 0])),
});
// A song is one page generation run: consecutive records sharing the request ID prefix and target.
// The page counter restarts when the WebView reloads, so equal prefixes are only merged when adjacent.
export function summarizeUsage(records) {
  const songs = [],
    total = empty();
  let previous;
  for (const record of records) {
    const run = record.requestId?.split('-')[0] ?? null;
    const key = `${run}:${record.target}`;
    if (key !== previous)
      songs.push({ run, target: record.target, ...empty() });
    previous = key;
    add(songs.at(-1), record);
    add(total, record);
  }
  return { songs, total };
}
export function formatUsage({ songs, total }) {
  const row = (label, run, target, sum) =>
    `| ${[label, run, target, sum.requests, sum.failed, ...fields.map((field) => sum[field])].join(' | ')} |`;
  const lines = [
    '| Song | Page run | Target | Requests | Failed | Lines sent | Input tokens | Cached input tokens | Output tokens | Reasoning tokens |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...songs.map((song, index) =>
      row(index + 1, song.run ?? 'unknown', song.target, song),
    ),
    row('Total', '', '', total),
  ];
  if (total.missing)
    lines.push(
      '',
      `${total.missing} records lacked input or output token counts; their tokens are not in the sums.`,
    );
  return lines.join('\n');
}
export function readUsage(file) {
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const file =
    process.argv[2] ??
    (existsSync(usageDirectory) ? readdirSync(usageDirectory) : [])
      .filter((name) => name.endsWith('.jsonl'))
      .sort()
      .map((name) => fileURLToPath(new URL(name, usageDirectory)))
      .at(-1);
  if (!file) {
    console.error('No pronunciation usage log found.');
    process.exitCode = 1;
  } else {
    console.log(`Usage log: ${file}\n`);
    console.log(formatUsage(summarizeUsage(readUsage(file))));
  }
}
