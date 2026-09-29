import assert from 'node:assert/strict';
import test from 'node:test';
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  validateRequest,
  validateResult,
  generatePronunciation,
} from './pronunciation.mjs';
import { summarizeUsage, usageLog, usageRecord } from './usage.mjs';

test('credential properties never consume an adjacent line', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'singbridge-config-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, 'server'));
  const config = join(directory, 'server', 'config.mjs');
  copyFileSync(new URL('./config.mjs', import.meta.url), config);
  for (const [properties, expected] of [
    ['OPENAI_API_KEY=\nYOUTUBE_API_KEY=fixture-other\n', null],
    ['OPEN_AI_API_KEY= \t\r\nYOUTUBE_API_KEY=fixture-other\r\n', null],
    ['OPENAI_API_KEY\n=fixture-other\n', null],
    ['OPENAI_API_KEY=\nOPEN_AI_API_KEY = fixture-key\n', 'fixture-key'],
    [
      'OPENAI_API_KEY \t= \tfixture-key \t\r\nYOUTUBE_API_KEY=fixture-other\r\n',
      'fixture-key',
    ],
  ]) {
    writeFileSync(join(directory, 'local.properties'), properties);
    const assertion =
      expected === null
        ? 'assert.throws(() => apiKey(), /Set OPENAI_API_KEY on the server/);'
        : `assert.equal(apiKey(), ${JSON.stringify(expected)});`;
    const child = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import assert from 'node:assert/strict'; import { apiKey } from ${JSON.stringify(pathToFileURL(config).href)}; ${assertion}`,
      ],
      { env: {}, encoding: 'utf8' },
    );
    assert.equal(child.status, 0, child.stderr);
  }
});

const request = {
  target: 'ko',
  lines: [{ id: 'line-0', text: '오늘도 Hello!' }],
};
const result = () => ({
  target: 'ko',
  lines: [
    {
      id: 'line-0',
      segments: [
        {
          source: '오늘도 ',
          language: 'ko',
          reading: null,
          pronunciation: null,
          needsReview: false,
        },
        {
          source: 'Hello!',
          language: 'en',
          reading: null,
          pronunciation: '헬로!',
          needsReview: false,
        },
      ],
    },
  ],
});
test('preserves exact mixed source partition', () => {
  assert.deepEqual(
    validateResult(validateRequest(request), result()),
    result(),
  );
});
test('rejects unsupported targets, extra fields, duplicated IDs and unbounded input', () => {
  for (const bad of [
    { ...request, target: 'fr' },
    { ...request, key: 'secret' },
    { ...request, lines: [...request.lines, ...request.lines] },
    { ...request, lines: [{ id: 'line-0', text: 'x'.repeat(501) }] },
  ])
    assert.throws(() => validateRequest(bad));
});
// Issue #37: the model often flags a phrase while supplying a pronunciation; keep it so the page can show it for review.
test('a review-flagged foreign phrase keeps the model pronunciation in both modes', async () => {
  const flagged = () => {
    const value = result();
    value.lines[0].segments[1].needsReview = true;
    return value;
  };
  assert.deepEqual(validateResult(request, flagged()), flagged());
  const response = await generatePronunciation(request, 'fixture-key', {
    fetcher: async () =>
      Response.json({
        status: 'completed',
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: JSON.stringify(flagged()) }],
          },
        ],
      }),
  });
  assert.deepEqual(response.result, flagged());
});
test('rejects source mutation, IDs, unknown fields, unsupported language, same-language rewriting and malformed fields', () => {
  for (const mutate of [
    (r) => (r.lines[0].segments[0].source = '오늘 '),
    (r) => (r.lines[0].id = 'wrong'),
    (r) => (r.lines[0].segments[0].extra = true),
    (r) => (r.lines[0].segments[0].language = 'fr'),
    (r) => (r.lines[0].segments[0].pronunciation = 'rewritten'),
    (r) => {
      r.lines[0].segments[1].needsReview = true;
      r.lines[0].segments[1].pronunciation = '   ';
    },
    (r) => (r.lines[0].segments[1].pronunciation = null),
    (r) => (r.lines[0].segments[1].pronunciation = '   '),
    (r) => (r.lines[0].segments[1].pronunciation = ''),
    (r) => {
      r.lines[0].segments[0].language = 'und';
      r.lines[0].segments[0].pronunciation = null;
    },
    (r) => (r.lines[0].segments[1].needsReview = 'yes'),
    (r) => (r.lines[0].segments[1].pronunciation = 42),
    (r) => (r.lines[0].segments[1].pronunciation = 'x'.repeat(1001)),
    (r) => (r.target = 'en'),
    (r) => r.lines.push(r.lines[0]),
  ]) {
    const value = result();
    mutate(value);
    assert.throws(() => validateResult(request, value));
  }
});
test('provider results that break review rules are normalized instead of failing the batch', async () => {
  for (const [mutate, index, expected] of [
    [
      (r) => (r.lines[0].segments[0].pronunciation = 'rewritten'),
      0,
      { language: 'ko', pronunciation: null, needsReview: false },
    ],
    [
      (r) => {
        r.lines[0].segments[1].needsReview = true;
        r.lines[0].segments[1].pronunciation = '  ';
      },
      1,
      { language: 'en', pronunciation: null, needsReview: true },
    ],
    [
      (r) => {
        r.lines[0].segments[0].language = 'und';
        r.lines[0].segments[0].pronunciation = '오늘도';
      },
      0,
      { language: 'und', pronunciation: null, needsReview: true },
    ],
    [
      (r) => (r.lines[0].segments[1].pronunciation = null),
      1,
      { language: 'en', pronunciation: null, needsReview: true },
    ],
    [
      (r) => (r.lines[0].segments[1].pronunciation = '   '),
      1,
      { language: 'en', pronunciation: null, needsReview: true },
    ],
    [
      (r) => (r.lines[0].segments[1].pronunciation = ''),
      1,
      { language: 'en', pronunciation: null, needsReview: true },
    ],
  ]) {
    const value = result();
    mutate(value);
    const response = await generatePronunciation(request, 'fixture-key', {
      fetcher: async () =>
        Response.json({
          status: 'completed',
          output: [
            {
              type: 'message',
              content: [{ type: 'output_text', text: JSON.stringify(value) }],
            },
          ],
        }),
    });
    const { source, reading } = result().lines[0].segments[index];
    assert.deepEqual(response.result.lines[0].segments[index], {
      source,
      reading,
      ...expected,
    });
    assert.deepEqual(
      response.result.lines[0].segments[1 - index],
      result().lines[0].segments[1 - index],
    );
  }
});
test('provider uses fixed model, no storage, strict schema; refuses incomplete or refused output', async () => {
  let sent;
  const fetcher = async (_, options) => {
    assert.equal(options.redirect, 'error');
    sent = JSON.parse(options.body);
    return Response.json({
      status: 'completed',
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: JSON.stringify(result()) }],
        },
      ],
      usage: { input_tokens: 1, output_tokens: 2 },
    });
  };
  const response = await generatePronunciation(request, 'fixture-key', {
    fetcher,
  });
  assert.deepEqual(response.result, result());
  assert.equal(sent.store, false);
  assert.equal(sent.text.format.strict, true);
  assert.equal(sent.model, 'gpt-5.4-mini-2026-03-17');
  for (const body of [
    { status: 'incomplete' },
    { status: 'completed', output: [{ content: [{ type: 'refusal' }] }] },
  ]) {
    await assert.rejects(
      generatePronunciation(request, 'fixture-key', {
        fetcher: async () => Response.json(body),
      }),
    );
  }
});

test('local HTTP boundary rejects browser origins, malformed data and concurrent calls', async (t) => {
  const { createPronunciationServer } = await import('./index.mjs');
  let finish,
    calls = 0;
  const server = createPronunciationServer('fixture-key', async () => {
    calls++;
    return new Promise((resolve) => {
      finish = () => resolve({ result: result() });
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/pronunciation`;
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-SingBridge-Client': 'native-dev',
    },
    body: JSON.stringify(request),
  };
  assert.equal(
    (
      await fetch(url, {
        ...options,
        headers: { ...options.headers, Origin: 'https://untrusted.example' },
      })
    ).status,
    403,
  );
  assert.equal((await fetch(url, { ...options, body: '{}' })).status, 400);
  assert.equal(
    (await fetch(url, { ...options, body: 'x'.repeat(32769) })).status,
    413,
  );
  assert.equal(calls, 0);
  const pending = fetch(url, options);
  while (!finish) await new Promise((resolve) => setImmediate(resolve));
  assert.equal((await fetch(url, options)).status, 429);
  finish();
  assert.equal((await pending).status, 200);
  assert.equal(calls, 1);
});

const completed = (usage) => ({
  status: 'completed',
  output: [
    {
      type: 'message',
      content: [{ type: 'output_text', text: JSON.stringify(result()) }],
    },
  ],
  usage,
});
test('provider reports usage before result checks, including billed failures', async () => {
  const usage = { input_tokens: 900, output_tokens: 6000 };
  const changed = result();
  changed.lines[0].segments[0].source = '오늘 ';
  const reported = [];
  for (const body of [
    { status: 'incomplete', usage },
    { ...completed(usage), output: [{ content: [{ type: 'refusal' }] }] },
    {
      ...completed(usage),
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: JSON.stringify(changed) }],
        },
      ],
    },
  ])
    await assert.rejects(
      generatePronunciation(request, 'fixture-key', {
        fetcher: async () => Response.json(body),
        onUsage: (value) => reported.push(value),
      }),
    );
  assert.deepEqual(reported, [usage, usage, usage]);
});

test('server records token counts per request without lyric text', async (t) => {
  const { createPronunciationServer } = await import('./index.mjs');
  const usage = {
    input_tokens: 1200,
    input_tokens_details: { cached_tokens: 1024 },
    output_tokens: 300,
    output_tokens_details: { reasoning_tokens: 100 },
  };
  const responses = [
    Response.json(completed(usage)),
    Response.json({
      status: 'incomplete',
      usage: { input_tokens: 1200, output_tokens: 6000 },
    }),
    new Response('', { status: 500 }),
    Response.json(completed(usage)),
  ];
  const records = [];
  const server = createPronunciationServer(
    'fixture-key',
    (input, key, options) =>
      generatePronunciation(input, key, {
        ...options,
        fetcher: async () => responses.shift(),
      }),
    (record) => records.push(record),
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/pronunciation`;
  const post = async (id) =>
    (
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SingBridge-Client': 'native-dev',
          'X-SingBridge-Request-Id': id,
        },
        body: JSON.stringify(request),
      })
    ).status;
  assert.equal(await post('1-1'), 200);
  assert.equal(await post('1-1'), 502);
  assert.equal(await post('2-1'), 502);
  assert.equal(await post('video-dQw4w9WgXcQ'), 200);
  const common = {
    model: 'gpt-5.4-mini-2026-03-17',
    target: 'ko',
    lines: 1,
  };
  assert.deepEqual(records, [
    {
      sequence: 1,
      requestId: '1-1',
      ...common,
      inputTokens: 1200,
      cachedInputTokens: 1024,
      outputTokens: 300,
      reasoningTokens: 100,
      ok: true,
    },
    {
      sequence: 2,
      requestId: '1-1',
      ...common,
      inputTokens: 1200,
      cachedInputTokens: null,
      outputTokens: 6000,
      reasoningTokens: null,
      ok: false,
    },
    {
      sequence: 4,
      requestId: null,
      ...common,
      inputTokens: 1200,
      cachedInputTokens: 1024,
      outputTokens: 300,
      reasoningTokens: 100,
      ok: true,
    },
  ]);
  const text = JSON.stringify(records);
  for (const secret of ['오늘도', 'Hello', 'fixture-key', 'dQw4w9WgXcQ'])
    assert.ok(!text.includes(secret), secret);
});

test('usage report sums adjacent page runs as songs', () => {
  const record = (requestId, target, inputTokens, outputTokens, ok = true) => ({
    requestId,
    target,
    lines: 12,
    inputTokens,
    cachedInputTokens: null,
    outputTokens,
    reasoningTokens: null,
    ok,
  });
  const { songs, total } = summarizeUsage([
    record('1-12', 'ko', 100, 10),
    record('1-12', 'ko', 100, 6000, false),
    record('1-24', 'ko', 100, 10),
    record('2-12', 'en', 100, 10),
    // A repeated prefix that is not adjacent stays a separate song.
    record('1-12', 'ko', 100, 10),
    record(null, 'ko', null, 10),
  ]);
  assert.deepEqual(
    songs.map((song) => [
      song.run,
      song.target,
      song.requests,
      song.failed,
      song.lines,
      song.inputTokens,
      song.outputTokens,
    ]),
    [
      ['1', 'ko', 3, 1, 36, 300, 6020],
      ['2', 'en', 1, 0, 12, 100, 10],
      ['1', 'ko', 1, 0, 12, 100, 10],
      [null, 'ko', 1, 0, 12, 0, 10],
    ],
  );
  assert.equal(total.requests, 6);
  assert.equal(total.inputTokens, 500);
  assert.equal(total.outputTokens, 6050);
  assert.equal(total.missing, 1);
});

test('usage report command prints per-song and total sums from a run log', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'singbridge-usage-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'run', 'usage.jsonl');
  const log = usageLog(pathToFileURL(file));
  const usage = { input_tokens: 1000, output_tokens: 200 };
  log(usageRecord(1, '3-12', request, usage, true));
  log(usageRecord(2, '3-20', request, usage, true));
  log(usageRecord(3, '4-12', { ...request, target: 'en' }, usage, false));
  const child = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('./usage.mjs', import.meta.url)), file],
    { encoding: 'utf8' },
  );
  assert.equal(child.status, 0, child.stderr);
  assert.match(
    child.stdout,
    /^\| 1 \| 3 \| ko \| 2 \| 0 \| 2 \| 2000 \| 0 \| 400 \| 0 \|$/m,
  );
  assert.match(
    child.stdout,
    /^\| 2 \| 4 \| en \| 1 \| 1 \| 1 \| 1000 \| 0 \| 200 \| 0 \|$/m,
  );
  assert.match(
    child.stdout,
    /^\| Total \| {2}\| {2}\| 3 \| 1 \| 3 \| 3000 \| 0 \| 600 \| 0 \|$/m,
  );
});

// Issue #23: Spanish is an experimental source language for both targets.
test('Spanish phrases are accepted for the Korean and English targets', () => {
  for (const [target, pronunciation] of [
    ['ko', '마냐나 세 요라'],
    ['en', 'mah-NYAH-nah seh YOH-rah'],
  ]) {
    const spanishRequest = validateRequest({
      target,
      lines: [{ id: 'line-0', text: '¿Mañana se llora?' }],
    });
    const value = {
      target,
      lines: [
        {
          id: 'line-0',
          segments: [
            {
              source: '¿Mañana se llora?',
              language: 'es',
              reading: null,
              pronunciation,
              needsReview: false,
            },
          ],
        },
      ],
    };
    assert.deepEqual(
      validateResult(spanishRequest, structuredClone(value)),
      value,
      target,
    );
  }
});
test('Spanish review rules match the other foreign languages', () => {
  const spanishRequest = validateRequest({
    target: 'ko',
    lines: [{ id: 'line-0', text: 'Tu corazón' }],
  });
  const segment = (fields) => ({
    target: 'ko',
    lines: [
      {
        id: 'line-0',
        segments: [
          {
            source: 'Tu corazón',
            language: 'es',
            reading: null,
            pronunciation: '투 코라손',
            needsReview: false,
            ...fields,
          },
        ],
      },
    ],
  });
  assert.throws(() =>
    validateResult(spanishRequest, segment({ pronunciation: null })),
  );
  assert.deepEqual(
    validateResult(spanishRequest, segment({ pronunciation: ' ' }), {
      normalize: true,
    }).lines[0].segments[0],
    {
      source: 'Tu corazón',
      language: 'es',
      reading: null,
      pronunciation: null,
      needsReview: true,
    },
  );
  assert.equal(
    validateResult(spanishRequest, segment({ needsReview: true }), {
      normalize: true,
    }).lines[0].segments[0].pronunciation,
    '투 코라손',
  );
});
test('the provider schema and instructions name Spanish', async () => {
  let sent;
  await generatePronunciation(request, 'fixture-key', {
    fetcher: async (_, options) => {
      sent = JSON.parse(options.body);
      return Response.json({
        status: 'completed',
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: JSON.stringify(result()) }],
          },
        ],
      });
    },
  });
  const language =
    sent.text.format.schema.properties.lines.items.properties.segments.items
      .properties.language;
  assert.deepEqual(language.enum, ['ja', 'ko', 'en', 'es', 'und']);
  assert.match(sent.instructions, /\bes\b.*Spanish/);
  assert.match(sent.instructions, /ñ/);
  // Every sentence ends before the next one starts; "es.Keep" reads as an identifier.
  assert.doesNotMatch(sent.instructions, /[a-z]\.[A-Za-z]/);
  // An uncertain Japanese reading gets the most likely pronunciation plus a review flag (#40).
  assert.match(sent.instructions, /most likely reading/);
  assert.match(sent.instructions, /per phrase, never for a whole batch/);
  assert.doesNotMatch(
    sent.instructions,
    /ambiguous phrases use needsReview=true and pronunciation=null/,
  );
  assert.doesNotMatch(sent.instructions, /Do not invent/);
});
