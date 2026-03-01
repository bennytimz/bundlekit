import dotenv from 'dotenv';
import { getJitoTipFloor, getRandomTipAccount, sendViaJito } from './jito.js';
import { getNozomiTipFloor, sendViaNozomi } from './nozomi.js';
import { authenticateAllRegions, HARMONIC_REGIONS, loadSignerKeypair } from './harmonic.js';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import nacl from 'tweetnacl';

dotenv.config();

const PROTO_DIR = path.join(process.cwd(), 'src', 'protos', 'proto');

function loadProto(filename: string) {
  return protoLoader.loadSync(path.join(PROTO_DIR, filename), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  });
}

export interface BroadcastResult {
  winner: string | null;
  totalEndpoints: number;
  results: {
    endpoint: string;
    success: boolean;
    latencyMs: number;
    id?: string;
    error?: string;
  }[];
  tipComparison: {
    jito: number;
    nozomi: number;
    recommendation: string;
  };
}

// Get current tip recommendations from all endpoints
export async function getTipComparison() {
  const [jitoTips, nozomiTips] = await Promise.all([
    getJitoTipFloor(),
    getNozomiTipFloor(),
  ]);

  const jitoCompetitive = jitoTips.competitive;
  const nozomiCompetitive = nozomiTips.competitive;

  let recommendation = '';
  if (jitoCompetitive < nozomiCompetitive) {
    const savings = (((nozomiCompetitive - jitoCompetitive) / nozomiCompetitive) * 100).toFixed(1);
    recommendation = `Jito is ${savings}% cheaper right now`;
  } else {
    const savings = (((jitoCompetitive - nozomiCompetitive) / jitoCompetitive) * 100).toFixed(1);
    recommendation = `Nozomi is ${savings}% cheaper right now`;
  }

  return {
    jito: jitoCompetitive,
    nozomi: nozomiCompetitive,
    recommendation,
  };
}

// Broadcast to all endpoints simultaneously
export async function broadcast(
  encodedTransactions: string[]
): Promise<BroadcastResult> {
  console.log('🚀 Broadcasting to all endpoints simultaneously...');
  console.log('');

  // Fire all endpoints at the same time
  const [jitoResult, ...harmonicResults] = await Promise.allSettled([
    // Jito
    sendViaJito(encodedTransactions).then((r) => ({
      endpoint: 'Jito',
      success: r.success,
      latencyMs: r.latencyMs ?? 0,
      id: r.bundleId,
      error: r.error,
    })),

    // Harmonic - all 6 regions simultaneously
    ...HARMONIC_REGIONS.map(async (region) => {
      const start = Date.now();
      try {
        const keypair = loadSignerKeypair();
        const packageDef = loadProto('auth.proto');
        const authProto = grpc.loadPackageDefinition(packageDef) as any;
        const searcherDef = loadProto('searcher.proto');
        const searcherProto = grpc.loadPackageDefinition(searcherDef) as any;

        const authClient = new authProto.auth.AuthService(
          region.url,
          grpc.credentials.createSsl()
        );

        // Authenticate
        const challengeResp = await new Promise<any>((resolve, reject) => {
          authClient.generateAuthChallenge(
            { role: 3, pubkey: keypair.publicKey.toBuffer() },
            (err: any, res: any) => err ? reject(err) : resolve(res)
          );
        });

        const challenge = `${keypair.publicKey.toBase58()}-${challengeResp.challenge}`;
        const signedChallenge = nacl.sign.detached(Buffer.from(challenge), keypair.secretKey);

        const tokenResp = await new Promise<any>((resolve, reject) => {
          authClient.generateAuthTokens(
            {
              challenge,
              client_pubkey: keypair.publicKey.toBuffer(),
              signed_challenge: signedChallenge,
            },
            (err: any, res: any) => err ? reject(err) : resolve(res)
          );
        });

        // Send bundle with token
        const metadata = new grpc.Metadata();
        metadata.add('authorization', `Bearer ${tokenResp.access_token}`);

        const searcherClient = new searcherProto.searcher.SearcherService(
          region.url,
          grpc.credentials.createSsl()
        );

        const packets = encodedTransactions.map((tx) => ({
          data: Buffer.from(tx, 'base64'),
          meta: {},
        }));

        const bundleResp = await new Promise<any>((resolve, reject) => {
          searcherClient.sendBundle(
            { bundle: { packets } },
            metadata,
            (err: any, res: any) => err ? reject(err) : resolve(res)
          );
        });

        return {
          endpoint: `Harmonic-${region.name}`,
          success: true,
          latencyMs: Date.now() - start,
          id: bundleResp.uuid,
        };

      } catch (error: any) {
        return {
          endpoint: `Harmonic-${region.name}`,
          success: false,
          latencyMs: Date.now() - start,
          error: error.message,
        };
      }
    }),
  ]);

  // Collect all results
  const allResults = [jitoResult, ...harmonicResults].map((r) =>
    r.status === 'fulfilled' ? r.value : {
      endpoint: 'unknown',
      success: false,
      latencyMs: 0,
      error: 'Promise rejected',
    }
  );

  // Find winner (fastest successful endpoint)
  const successful = allResults
    .filter((r) => r.success)
    .sort((a, b) => a.latencyMs - b.latencyMs);

  const winner = successful.length > 0 ? successful[0].endpoint : null;

  // Get tip comparison
  const tipComparison = await getTipComparison();

  // Display results
  console.log('📊 Broadcast Results:');
  console.log('');
  allResults.forEach((r) => {
    const status = r.success ? '✅' : '❌';
    const id = r.id ? ` | ID: ${r.id.slice(0, 8)}...` : '';
    const error = r.error ? ` | Error: ${r.error.slice(0, 50)}` : '';
    console.log(`   ${status} ${r.endpoint}: ${r.latencyMs}ms${id}${error}`);
  });

  console.log('');
  if (winner) {
    console.log(`🏆 Winner: ${winner}`);
  } else {
    console.log('⚠️ No endpoints succeeded');
  }

  console.log('');
  console.log('💰 Tip Comparison:');
  console.log(`   Jito competitive tip:   ${tipComparison.jito} SOL`);
  console.log(`   Nozomi competitive tip: ${tipComparison.nozomi} SOL`);
  console.log(`   💡 ${tipComparison.recommendation}`);

  return {
    winner,
    totalEndpoints: allResults.length,
    results: allResults,
    tipComparison,
  };
}