import { validateRequest, validateResult } from '../../server/pronunciation.mjs';

export function captureCases(data) {
  try {
    if (!data || data.version !== 1 ||
        Object.keys(data).sort().join() !== 'request,result,version') throw new Error();
    const request = validateRequest(data.request);
    const result = validateResult(request, data.result);
    return { target: request.target, cases: result.lines.flatMap(line =>
      line.segments.map((segment, segmentIndex) => ({
        id: `${line.id}:${segmentIndex}`, lineId: line.id, segmentIndex,
        source: segment.source, language: segment.language, modelReading: segment.reading,
        pronunciation: segment.pronunciation, needsReview: segment.needsReview,
      }))) };
  } catch {
    throw new Error('Invalid capture: expected matching pronunciation request and result');
  }
}
