import { readFile, stat } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { engine, loadReference } from './reference.mjs';

const outcomes = ['reference_match', 'reference_difference', 'unassessable'];
try {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const files = args.filter(arg => arg !== '--check');
  if (files.length > 1 || args.filter(arg => arg === '--check').length > 1 || files.some(arg => arg.startsWith('--'))) {
    throw new Error('Usage: node evaluate.mjs [cases.json] [--check]');
  }
  const file = files[0] || new URL('./cases.json', import.meta.url);
  const info = await stat(file);
  if (!info.isFile() || info.size > 1048576) throw new Error('Invalid fixture: expected a JSON file up to 1 MiB');
  const data = JSON.parse(await readFile(file, 'utf8'));
  if (!data || data.version !== 1 || !Array.isArray(data.cases) || !data.cases.length || data.cases.length > 100 ||
      data.cases.some(row => !row || typeof row !== 'object' || Array.isArray(row) ||
        (check && !outcomes.includes(row.expected))) || new Set(data.cases.map(row => row.id)).size !== data.cases.length) {
    throw new Error('Invalid fixture: version, cases, IDs, or expected outcomes');
  }
  const start = performance.now();
  const reference = await loadReference();
  const startupMs = performance.now() - start;
  const results = data.cases.map(row => {
    const began = performance.now();
    return { ...reference.analyze(row), elapsedMs: performance.now() - began };
  });
  const count = outcome => results.filter(row => row.status === outcome).length;
  const matches = count('reference_match'), differences = count('reference_difference');
  const comparable = matches + differences;
  const baselineMismatches = check ? results.filter((row, index) => row.status !== data.cases[index].expected).map(row => row.id) : [];
  console.log(JSON.stringify({ engine, node: process.version, startupMs,
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
