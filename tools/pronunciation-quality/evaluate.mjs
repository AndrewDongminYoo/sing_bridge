import { readFile, stat } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { engine, loadReference } from './reference.mjs';
import { captureCases } from './capture.mjs';

const outcomes = ['reference_match', 'reference_difference', 'unassessable'];
try {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const response = args.includes('--response');
  const files = args.filter(arg => !['--check', '--response'].includes(arg));
  if (files.length > 1 || ['--check', '--response'].some(flag => args.filter(arg => arg === flag).length > 1) ||
      files.some(arg => arg.startsWith('--')) || (response && (check || files.length !== 1))) {
    throw new Error('Usage: node evaluate.mjs [cases.json] [--check] OR capture.json --response');
  }
  const file = files[0] || new URL('./cases.json', import.meta.url);
  const info = await stat(file);
  if (!info.isFile() || info.size > 1048576) throw new Error('Invalid fixture: expected a JSON file up to 1 MiB');
  let data;
  try { data = JSON.parse(await readFile(file, 'utf8')); }
  catch { throw new Error('Invalid JSON input'); }
  const capture = response ? captureCases(data) : null;
  if (!response && (!data || data.version !== 1 || !Array.isArray(data.cases) || !data.cases.length || data.cases.length > 100 ||
      data.cases.some(row => !row || typeof row !== 'object' || Array.isArray(row) ||
        (check && !outcomes.includes(row.expected))) || new Set(data.cases.map(row => row.id)).size !== data.cases.length)) {
    throw new Error('Invalid fixture: version, cases, IDs, or expected outcomes');
  }
  const start = performance.now();
  const reference = await loadReference();
  const startupMs = performance.now() - start;
  const cases = capture?.cases || data.cases;
  const results = cases.map(row => {
    const began = performance.now();
    const provenance = response ? { lineId: row.lineId, segmentIndex: row.segmentIndex,
      pronunciation: row.pronunciation, needsReview: row.needsReview } : {};
    const comparison = response && !row.source.trim() ? { id: row.id, source: row.source,
      language: row.language, modelReading: row.modelReading, dictionaryReading: null,
      dictionaryPronunciation: null, tokens: [], status: 'unassessable', reason: 'non_lexical_source' } : reference.analyze(row);
    return { ...comparison, ...provenance, elapsedMs: performance.now() - began };
  });
  const count = outcome => results.filter(row => row.status === outcome).length;
  const matches = count('reference_match'), differences = count('reference_difference');
  const comparable = matches + differences;
  const baselineMismatches = check ? results.filter((row, index) => row.status !== cases[index].expected).map(row => row.id) : [];
  const context = response ? { target: capture.target, modelReviewRequired: cases.filter(row => row.needsReview).length } : {};
  console.log(JSON.stringify({ inputKind: response ? 'response' : 'cases', ...context, engine, node: process.version, startupMs,
    limitations: 'Dictionary agreement is not pronunciation or singing accuracy. Unknown and unsupported phrases are not assessed.',
    summary: { total: results.length, comparable, matches, differences, unassessable: count('unassessable'),
      coverage: comparable / results.length, agreementAmongComparable: comparable ? matches / comparable : null },
    baselineMismatches, results }, null, 2));
  if (baselineMismatches.length) {
    console.error('Baseline mismatch: ' + baselineMismatches.join(', ')); process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message); process.exitCode = 2;
}
