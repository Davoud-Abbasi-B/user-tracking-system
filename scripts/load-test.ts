import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

type Result = {
  status: number;
  durationMs: number;
};

const targetRps = Number(process.argv[2] ?? 100);
const durationSeconds = Number(process.argv[3] ?? 30);
const apiKey = process.env.API_KEY ?? 'dev-tracking-api-key';
const baseUrl = process.env.LOAD_TEST_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

async function main() {
  const totalRequests = targetRps * durationSeconds;
  const results: Result[] = [];
  const startedAt = performance.now();

  for (let second = 0; second < durationSeconds; second += 1) {
    const batchStartedAt = performance.now();
    const requests = Array.from({ length: targetRps }, () => sendEvent());
    const batchResults = await Promise.all(requests);
    results.push(...batchResults);

    const elapsed = performance.now() - batchStartedAt;
    if (elapsed < 1_000) {
      await sleep(1_000 - elapsed);
    }
  }

  const durationMs = performance.now() - startedAt;
  const success = results.filter((result) => result.status >= 200 && result.status < 300).length;
  const failed = results.length - success;
  const sortedDurations = results.map((result) => result.durationMs).sort((a, b) => a - b);
  const p50 = percentile(sortedDurations, 0.5);
  const p95 = percentile(sortedDurations, 0.95);
  const p99 = percentile(sortedDurations, 0.99);

  console.log(JSON.stringify({
    target_rps: targetRps,
    duration_seconds: durationSeconds,
    total_requests: totalRequests,
    completed_requests: results.length,
    actual_rps: Number((results.length / (durationMs / 1_000)).toFixed(2)),
    success,
    failed,
    p50_ms: Number(p50.toFixed(2)),
    p95_ms: Number(p95.toFixed(2)),
    p99_ms: Number(p99.toFixed(2)),
    status_counts: statusCounts(results)
  }, null, 2));
}

async function sendEvent(): Promise<Result> {
  const eventId = randomUUID().slice(0, 8);
  const body = {
    event_name: 'start_WBI_fail',
    event_time: new Date().toISOString(),
    product_name: 'ghabzino',
    platform: 'web',
    user: {
      user_id: `load_user_${eventId}`,
      anonymous_id: `load_anon_${eventId}`,
      session_id: `load_sess_${eventId}`
    },
    attribution: {
      campaign_name: 'load_test',
      source: 'local',
      medium: 'script',
      referer: null,
      attribution_source_type: 'direct'
    },
    parameters: {
      Product: 'waterbillinquiry',
      message: 'load test',
      error_code: 'LOAD_TEST'
    },
    metadata: {
      producer: 'client',
      source_of_truth: 'client',
      schema_version: '1.0'
    }
  };

  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}/api/v1/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(body)
    });

    await response.text();
    return { status: response.status, durationMs: performance.now() - startedAt };
  } catch {
    return { status: 0, durationMs: performance.now() - startedAt };
  }
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) {
    return 0;
  }
  return values[Math.min(values.length - 1, Math.floor(values.length * percentileValue))];
}

function statusCounts(results: Result[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const result of results) {
    const key = String(result.status);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
