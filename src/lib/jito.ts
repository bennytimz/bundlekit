import dotenv from 'dotenv';

dotenv.config();

const JITO_ENDPOINT = process.env.JITO_ENDPOINT!;

// Jito tip accounts - pick one randomly to reduce contention
const JITO_TIP_ACCOUNTS = [
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt13fkA4xk',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
];

// Get a random tip account
export function getRandomTipAccount(): string {
  return JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];
}

// Fetch Jito tip floor
export async function getJitoTipFloor(): Promise<{
  min: number;
  median: number;
  competitive: number;
  high: number;
  urgent: number;
}> {
  try {
    const response = await fetch('https://bundles.jito.wtf/api/v1/bundles/tip_floor');
    const data = await response.json();
    const latest = data[0];

    return {
      min: latest.landed_tips_25th_percentile,
      median: latest.landed_tips_50th_percentile,
      competitive: latest.landed_tips_75th_percentile,
      high: latest.landed_tips_95th_percentile,
      urgent: latest.landed_tips_99th_percentile,
    };
  } catch {
    console.log('⚠️ Could not fetch Jito tip floor, using defaults');
    return { min: 0.001, median: 0.001, competitive: 0.005, high: 0.01, urgent: 0.03 };
  }
}

// Send a bundle to Jito
export async function sendViaJito(
  encodedTransactions: string[]
): Promise<{ success: boolean; bundleId?: string; error?: string; latencyMs?: number }> {
  const start = Date.now();

  try {
    const response = await fetch(`${JITO_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sendBundle',
        params: [encodedTransactions],
      }),
    });

    const data = await response.json();
    const latencyMs = Date.now() - start;

    if (data.result) {
      return { success: true, bundleId: data.result, latencyMs };
    } else {
      return { success: false, error: JSON.stringify(data.error), latencyMs };
    }

  } catch (error: any) {
    return { success: false, error: error.message, latencyMs: Date.now() - start };
  }
}