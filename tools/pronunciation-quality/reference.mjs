import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const kuromoji = require('kuromoji');
const packagePath = require.resolve('kuromoji/package.json');
export const engine = { name: 'kuromoji', version: require(packagePath).version };
const separators = /[\p{P}\p{Z}\s]/gu;

function kana(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFKC').replace(separators, '')
    .replace(/[ぁ-ゖ]/g, char => String.fromCharCode(char.charCodeAt(0) + 0x60));
  return /^[ァ-ヶー]+$/.test(normalized) && /[ァ-ヶ]/.test(normalized) ? normalized : null;
}

function validatePhrase(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      typeof value.id !== 'string' || !value.id.length || value.id.length > 80 ||
      typeof value.language !== 'string' || !value.language.length || value.language.length > 35 ||
      typeof value.source !== 'string' || !value.source.trim() || value.source.length > 500 ||
      !(value.modelReading == null || (typeof value.modelReading === 'string' && value.modelReading.length <= 1000))) {
    throw new Error('Invalid phrase');
  }
}

export async function loadReference() {
  const tokenizer = await new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: join(dirname(packagePath), 'dict') }).build((error, value) => {
      if (error) reject(error); else resolve(value);
    });
  });
  return {
    analyze(input) {
      validatePhrase(input);
      const { id, source, language } = input;
      const modelReading = input.modelReading ?? null;
      const result = { id, source, modelReading, language, dictionaryReading: null,
        dictionaryPronunciation: null, tokens: [], status: 'unassessable', reason: null };
      const unavailable = reason => ({ ...result, reason });
      if (language !== 'ja') return unavailable('unsupported_language');
      const letters = source.normalize('NFKC').replace(separators, '');
      if (!letters || !/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(letters)) {
        return unavailable('unsupported_source');
      }
      result.tokens = tokenizer.tokenize(source).map(token => ({ surface: token.surface_form,
        type: token.word_type, reading: token.reading || null, pronunciation: token.pronunciation || null }));
      if (result.tokens.map(token => token.surface).join('') !== source) return unavailable('incomplete_dictionary');
      for (const token of result.tokens) {
        if (!token.surface.replace(separators, '')) continue;
        if (token.type !== 'KNOWN' || !kana(token.reading) || !kana(token.pronunciation)) {
          return unavailable('incomplete_dictionary');
        }
      }
      result.dictionaryReading = result.tokens.map(t => t.reading || t.surface).join('');
      result.dictionaryPronunciation = result.tokens.map(t => t.pronunciation || t.surface).join('');
      const expected = kana(modelReading);
      if (!expected) return unavailable('unsupported_or_missing_reading');
      const candidates = [kana(result.dictionaryReading), kana(result.dictionaryPronunciation)];
      if (candidates.some(candidate => !candidate)) return unavailable('incomplete_dictionary');
      const match = candidates.includes(expected);
      return { ...result, status: match ? 'reference_match' : 'reference_difference',
        reason: match ? 'dictionary_candidate' : 'different_reading' };
    },
  };
}
