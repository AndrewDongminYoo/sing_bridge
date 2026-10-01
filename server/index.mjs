import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { apiKey } from './config.mjs';
import {
  generatePronunciation,
  rejectionReason,
  validateRequest,
} from './pronunciation.mjs';
import { usageDirectory, usageLog, usageRecord } from './usage.mjs';

// Development only: loopback binding, native clients, no browser CORS access.
export function createPronunciationServer(
  key,
  generate = generatePronunciation,
  record = () => {},
) {
  let active = false,
    calls = 0;
  return createServer(
    { requestTimeout: 10000, headersTimeout: 10000 },
    async (req, res) => {
      const send = (status, body) => {
        res.writeHead(status, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        });
        res.end(JSON.stringify(body));
      };
      if (
        req.method !== 'POST' ||
        req.url !== '/pronunciation' ||
        req.headers.origin ||
        req.headers['content-type'] !== 'application/json' ||
        req.headers['x-singbridge-client'] !== 'native-dev'
      ) {
        send(403, { error: 'not_allowed' });
        return;
      }
      if (active || calls >= 100) {
        send(429, { error: 'busy_or_session_limit' });
        return;
      }
      active = true;
      const controller = new AbortController();
      res.on('close', () => controller.abort());
      try {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 32768) {
            send(413, { error: 'too_large' });
            return;
          }
          chunks.push(chunk);
        }
        let input;
        try {
          input = validateRequest(
            JSON.parse(Buffer.concat(chunks).toString('utf8')),
          );
        } catch {
          send(400, { error: 'invalid_request' });
          return;
        }
        calls++;
        let usage = null,
          ok = false,
          reason = null;
        try {
          const { result } = await generate(input, key, {
            signal: controller.signal,
            onUsage: (value) => (usage = value),
          });
          ok = true;
          send(200, result);
        } catch (error) {
          reason = rejectionReason(error);
          throw error;
        } finally {
          if (usage)
            record(
              usageRecord(
                calls,
                req.headers['x-singbridge-request-id'],
                input,
                usage,
                ok,
                reason,
              ),
            );
        }
      } catch {
        if (!res.destroyed) send(502, { error: 'pronunciation_unavailable' });
      } finally {
        active = false;
      }
    },
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const usageFile = new URL(
      `${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`,
      usageDirectory,
    );
    createPronunciationServer(
      apiKey(),
      generatePronunciation,
      usageLog(usageFile),
    ).listen(18773, '127.0.0.1', () =>
      console.log(
        `SingBridge pronunciation server: http://127.0.0.1:18773 (development only)\nToken usage log: ${fileURLToPath(usageFile)}`,
      ),
    );
  } catch {
    console.error(
      'Unable to load server credential. Set OPENAI_API_KEY or OPEN_AI_API_KEY.',
    );
    process.exitCode = 1;
  }
}
