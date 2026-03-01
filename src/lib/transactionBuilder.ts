import {
  Connection,
  Transaction,
  SystemProgram,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { connection } from './nozomi.js';
import { getRandomTipAccount } from './jito.js';
import { getNozomiTipFloor } from './nozomi.js';
import { getJitoTipFloor } from './jito.js';
import dotenv from 'dotenv';
import bs58 from 'bs58';

dotenv.config();

export type TipLevel = 'min' | 'median' | 'competitive' | 'high' | 'urgent';
export type Endpoint = 'jito' | 'nozomi' | 'harmonic' | 'all';

// Load your signer keypair from .env
export function loadSignerKeypair(): Keypair {
  const privateKey = process.env.HARMONIC_SIGNER_PRIVATE_KEY!;
  const decoded = bs58.decode(privateKey);
  return Keypair.fromSecretKey(decoded);
}

// Get recommended tip amount based on endpoint and level
export async function getRecommendedTip(
  endpoint: 'jito' | 'nozomi',
  level: TipLevel
): Promise<number> {
  if (endpoint === 'jito') {
    const tips = await getJitoTipFloor();
    return tips[level] * LAMPORTS_PER_SOL;
  } else {
    const tips = await getNozomiTipFloor();
    return tips[level] * LAMPORTS_PER_SOL;
  }
}

// Build a Jito bundle transaction
// Jito requires a SOL transfer to a tip account as the last instruction
export async function buildJitoTransaction(
  keypair: Keypair,
  tipLevel: TipLevel = 'competitive'
): Promise<{ transaction: Transaction; encodedTx: string }> {
  const { blockhash } = await connection.getLatestBlockhash();
  const tipLamports = await getRecommendedTip('jito', tipLevel);
  const tipAccount = new PublicKey(getRandomTipAccount());

  const transaction = new Transaction();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = keypair.publicKey;

  // Set compute unit price for priority
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1000,
    })
  );

  // Your actual instruction goes here
  // For testing we use a self transfer of 0 SOL (no-op)
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: keypair.publicKey,
      lamports: 0,
    })
  );

  // Jito tip instruction (must be last)
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: tipAccount,
      lamports: Math.floor(tipLamports),
    })
  );

  transaction.sign(keypair);

  const encodedTx = Buffer.from(
    transaction.serialize()
  ).toString('base64');

  return { transaction, encodedTx };
}

// Build a Nozomi transaction
// Nozomi uses priority fees + tip transfer to their tip address
export async function buildNozomiTransaction(
  keypair: Keypair,
  tipLevel: TipLevel = 'competitive'
): Promise<{ transaction: Transaction; encodedTx: string }> {
  const { blockhash } = await connection.getLatestBlockhash();
  const tipLamports = await getRecommendedTip('nozomi', tipLevel);
  const tipAddress = new PublicKey(process.env.NOZOMI_TIP_ADDRESS!);

  const transaction = new Transaction();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = keypair.publicKey;

  // Set compute unit price
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1000,
    })
  );

  // Your actual instruction goes here
  // For testing we use a self transfer of 0 SOL (no-op)
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: keypair.publicKey,
      lamports: 0,
    })
  );

  // Nozomi tip instruction
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: tipAddress,
      lamports: Math.floor(tipLamports),
    })
  );

  transaction.sign(keypair);

  const encodedTx = Buffer.from(
    transaction.serialize()
  ).toString('base64');

  return { transaction, encodedTx };
}

// Build a Harmonic transaction
// Harmonic uses priority fees only - no tip account needed
export async function buildHarmonicTransaction(
  keypair: Keypair,
  priorityFeeMicroLamports: number = 10000
): Promise<{ transaction: Transaction; encodedTx: string }> {
  const { blockhash } = await connection.getLatestBlockhash();

  const transaction = new Transaction();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = keypair.publicKey;

  // Harmonic tip = just a high compute unit price
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFeeMicroLamports,
    })
  );

  // Your actual instruction goes here
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: keypair.publicKey,
      lamports: 0,
    })
  );

  transaction.sign(keypair);

  const encodedTx = Buffer.from(
    transaction.serialize()
  ).toString('base64');

  return { transaction, encodedTx };
}