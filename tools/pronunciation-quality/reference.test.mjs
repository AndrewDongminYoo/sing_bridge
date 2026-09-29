import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { loadReference } from './reference.mjs';

let reference;
before(async () => {
  reference = await loadReference();
});
const phrase = (source, modelReading, language = 'ja') => ({
  id: 'phrase-1',
  source,
  modelReading,
  language,
});

test('real dictionary compares kana readings without changing source or phrase boundaries', () => {
  const input = Object.freeze(phrase('青い空。', 'あおい そら！'));
  const result = reference.analyze(input);
  assert.equal(result.status, 'reference_match');
  assert.equal(result.source, input.source);
  assert.equal(result.modelReading, input.modelReading);
  assert.equal(result.id, input.id);
  assert.equal(result.dictionaryReading, 'アオイソラ。');
  assert.equal(result.tokens.map((t) => t.surface).join(''), input.source);
});

test('different comparable reading is a disagreement rather than an accuracy verdict', () => {
  const result = reference.analyze(phrase('青い空', 'アカイソラ'));
  assert.equal(result.status, 'reference_difference');
  assert.equal(result.reason, 'different_reading');
});

test('normalization preserves long vowels, geminates and voicing', () => {
  for (const [source, matching, different] of [
    ['スーパー', 'スーパー', 'スパ'],
    ['きっと', 'キット', 'キト'],
    ['風', 'カゼ', 'カセ'],
  ]) {
    assert.equal(
      reference.analyze(phrase(source, matching)).status,
      'reference_match',
      source,
    );
    assert.equal(
      reference.analyze(phrase(source, different)).status,
      'reference_difference',
      source,
    );
  }
  assert.equal(
    reference.analyze(phrase('スーパー', 'ｽｰﾊﾟｰ')).status,
    'reference_match',
  );
  assert.equal(
    reference.analyze(phrase('風', 'カセ\u3099')).status,
    'reference_match',
  );
});

test('missing, empty or unsupported model readings cannot be counted as a match', () => {
  for (const reading of [
    null,
    '',
    '  ',
    '。。。',
    'aoi sora',
    '青い空',
    '아오이 소라',
    'アオイ🎵ソラ',
    'ーー',
  ]) {
    assert.equal(
      reference.analyze(phrase('青い空', reading)).status,
      'unassessable',
      String(reading),
    );
  }
});

test('unknown kanji and mixed source scripts cannot claim full dictionary coverage', () => {
  for (const source of [
    '𠮷',
    '青い空 Hello',
    'Kimi to arukou',
    '青い空123',
    '青い空🎵',
  ]) {
    assert.equal(
      reference.analyze(phrase(source, 'アオイソラ')).status,
      'unassessable',
      source,
    );
  }
  const unknown = reference.analyze(phrase('𠮷', 'ヨシ'));
  assert.equal(unknown.reason, 'incomplete_dictionary');
  assert.ok(
    unknown.tokens.some((token) => token.type === 'UNKNOWN' || !token.reading),
  );
});

test('unsupported languages are preserved without reclassification', () => {
  for (const input of [
    phrase('같이 걸어요', 'gachi georeoyo', 'ko'),
    phrase('Hello', 'ハロー', 'en'),
  ]) {
    const result = reference.analyze(input);
    assert.equal(result.status, 'unassessable');
    assert.equal(result.reason, 'unsupported_language');
    assert.equal(result.source, input.source);
    assert.equal(result.language, input.language);
  }
});

test('dictionary lexical reading and pronunciation are both reported for particles', () => {
  const result = reference.analyze(
    phrase('私は駅へ歩く', 'ワタシワエキエアルク'),
  );
  assert.equal(result.status, 'reference_match');
  assert.equal(result.dictionaryReading, 'ワタシハエキヘアルク');
  assert.equal(result.dictionaryPronunciation, 'ワタシワエキエアルク');
});

test('malformed or oversized phrases are rejected before dictionary processing', () => {
  for (const input of [
    null,
    phrase('', 'ア'),
    phrase('空'.repeat(501), 'ソラ'),
    phrase('空', 1),
    { ...phrase('空', 'ソラ'), id: '' },
    { ...phrase('空', 'ソラ'), language: null },
  ]) {
    assert.throws(() => reference.analyze(input), /Invalid phrase/);
  }
});

test('omitted optional model reading is explicitly unassessable', () => {
  const result = reference.analyze({
    id: 'no-reading',
    language: 'ja',
    source: '空',
  });
  assert.equal(result.status, 'unassessable');
  assert.equal(result.modelReading, null);
});
