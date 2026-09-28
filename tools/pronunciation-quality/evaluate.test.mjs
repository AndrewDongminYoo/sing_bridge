import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('./evaluate.mjs', import.meta.url));
const cases = [
  { id: 'match', language: 'ja', source: '青い空', modelReading: 'アオイソラ', expected: 'reference_match' },
  { id: 'difference', language: 'ja', source: '青い空', modelReading: 'アカイソラ', expected: 'reference_difference' },
  { id: 'unknown', language: 'en', source: 'Hello', modelReading: null, expected: 'unassessable' },
];
function run(data, args = ['--check']) {
  const dir = mkdtempSync(join(tmpdir(), 'singbridge-quality-'));
  try {
    const file = join(dir, 'cases.json'); writeFileSync(file, JSON.stringify(data));
    return spawnSync(process.execPath, [cli, file, ...args], { encoding: 'utf8', timeout: 10000 });
  } finally { rmSync(dir, { recursive: true }); }
}

test('CLI measures comparison coverage separately from dictionary agreement', () => {
  const result = run({ version: 1, cases });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.summary, { total: 3, comparable: 2, matches: 1, differences: 1,
    unassessable: 1, coverage: 2 / 3, agreementAmongComparable: 0.5 });
  assert.equal(report.engine.name, 'kuromoji');
  assert.equal(report.engine.version, '0.1.2');
  assert.ok(report.startupMs > 0);
  assert.ok(report.results.every(row => row.elapsedMs >= 0));
  assert.deepEqual(report.results.map(row => row.source), cases.map(row => row.source));
});

test('check mode fails a deliberately incorrect baseline instead of accepting its shape', () => {
  const result = run({ version: 1, cases: [{ ...cases[0], expected: 'reference_difference' }] });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Baseline mismatch: match/);
  assert.deepEqual(JSON.parse(result.stdout).baselineMismatches, ['match']);
});

test('zero comparable phrases yields no agreement score', () => {
  const result = run({ version: 1, cases: [cases[2]] });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).summary.agreementAmongComparable, null);
});

test('malformed fixture schema, duplicate IDs, and missing baselines fail explicitly', () => {
  for (const input of [{}, { version: 2, cases }, { version: 1, cases: [] },
    { version: 1, cases: [cases[0], cases[0]] },
    { version: 1, cases: [{ ...cases[0], expected: undefined }] },
    { version: 1, cases: [{ ...cases[0], source: null }] }]) {
    const result = run(input);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Invalid (fixture|phrase)/);
  }
});

test('report-only mode permits user samples without expected outcomes', () => {
  const result = run({ version: 1, cases: [{ ...cases[0], expected: undefined }] }, []);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).results[0].status, 'reference_match');
});
