import {
  Connection,
  Transaction,
  SystemProgram,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

const NOZOMI_ENDPOINT = process.env.NOZOMI_ENDPOINT!;
const NOZOMI_API_KEY = process.env.NOZOMI_API_KEY!;
const NOZOMI_TIP_ADDRESS = process.env.NOZOMI_TIP_ADDRESS!;
const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL!;

// This is the connection to Solana mainnet via Helius
export const connection = new Connection(HELIUS_RPC_URL, 'confirmed');

// The Nozomi submission URL
export const nozomiUrl = `${NOZOMI_ENDPOINT}/?c=${NOZOMI_API_KEY}`;

// Fetch the current minimum tip from Nozomi's live API
export async function getNozomiTipFloor(): Promise<{
  min: number;
  median: number;
  competitive: number;
  high: number;
  urgent: number;
}> {
  try {
    const response = await fetch('https://api.nozomi.temporal.xyz/tip_floor');
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
    console.log('⚠️ Could not fetch tip floor, using defaults');
    return { min: 0.001, median: 0.001, competitive: 0.005, high: 0.01, urgent: 0.03 };
  }
}

// Add a tip instruction to your transaction
export function buildTipInstruction(
  senderPublicKey: PublicKey,
  lamports: number
) {
  return SystemProgram.transfer({
    fromPubkey: senderPublicKey,
    toPubkey: new PublicKey(NOZOMI_TIP_ADDRESS),
    lamports,
  });
}

// Send a transaction through Nozomi
export async function sendViaNozomi(
  transaction: Transaction,
  signers: Keypair[]
): Promise<{ success: boolean; signature?: string; error?: string; latencyMs?: number }> {
  const start = Date.now();

  try {
    // Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = signers[0].publicKey;

    // Sign the transaction
    transaction.sign(...signers);

    // Serialize and encode
    const serialized = transaction.serialize();
    const encoded = Buffer.from(serialized).toString('base64');

    // Submit to Nozomi
    const response = await fetch(nozomiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sendTransaction',
        params: [encoded, { encoding: 'base64' }],
      }),
    });

    const data = await response.json();
    const latencyMs = Date.now() - start;

    if (data.result) {
      return { success: true, signature: data.result, latencyMs };
    } else {
      return { success: false, error: JSON.stringify(data.error), latencyMs };
    }

  } catch (error: any) {
    return { success: false, error: error.message, latencyMs: Date.now() - start };
  }
}