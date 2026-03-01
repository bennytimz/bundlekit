import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import nacl from 'tweetnacl';

dotenv.config();

// All 6 Harmonic regions
export const HARMONIC_REGIONS = [
  { name: 'Frankfurt', url: 'fra.be.harmonic.gg:443' },
  { name: 'London', url: 'lon.be.harmonic.gg:443' },
  { name: 'Amsterdam', url: 'ams.be.harmonic.gg:443' },
  { name: 'Newark', url: 'ewr.be.harmonic.gg:443' },
  { name: 'Tokyo', url: 'tyo.be.harmonic.gg:443' },
  { name: 'Singapore', url: 'sgp.be.harmonic.gg:443' },
];

// Load proto files
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

// Load your whitelisted keypair from private key in .env
export function loadSignerKeypair(): Keypair {
  const privateKey = process.env.HARMONIC_SIGNER_PRIVATE_KEY!;
  const decoded = bs58.decode(privateKey);
  return Keypair.fromSecretKey(decoded);
}

// Authenticate with a single Harmonic region
export async function authenticateWithRegion(
  regionName: string,
  url: string,
  keypair: Keypair
): Promise<{ region: string; success: boolean; token?: string; error?: string; latencyMs: number }> {
  const start = Date.now();

  return new Promise((resolve) => {
    try {
      const packageDef = loadProto('auth.proto');
      const proto = grpc.loadPackageDefinition(packageDef) as any;

      const client = new proto.auth.AuthService(
        url,
        grpc.credentials.createSsl()
      );

      const pubkey = keypair.publicKey.toBuffer();

      // Step 1: Request challenge
      client.generateAuthChallenge(
        { role: 3, pubkey: pubkey },
        (err: any, challengeResponse: any) => {
          if (err) {
            resolve({
              region: regionName,
              success: false,
              error: err.message,
              latencyMs: Date.now() - start,
            });
            return;
          }

          // Step 2: Sign the challenge
          const challenge = `${keypair.publicKey.toBase58()}-${challengeResponse.challenge}`;
          const signedChallenge = nacl.sign.detached(Buffer.from(challenge), keypair.secretKey);

          // Step 3: Exchange for token
          client.generateAuthTokens(
            {
              challenge,
              client_pubkey: pubkey,
              signed_challenge: signedChallenge,
            },
            (err: any, tokenResponse: any) => {
              const latencyMs = Date.now() - start;
              if (err) {
                resolve({ region: regionName, success: false, error: err.message, latencyMs });
              } else {
                resolve({
                  region: regionName,
                  success: true,
                  token: tokenResponse.access_token,
                  latencyMs,
                });
              }
              client.close();
            }
          );
        }
      );

    } catch (error: any) {
      resolve({
        region: regionName,
        success: false,
        error: error.message,
        latencyMs: Date.now() - start,
      });
    }
  });
}

// Authenticate with all regions simultaneously
export async function authenticateAllRegions() {
  console.log('🔐 Authenticating with all Harmonic regions...');
  console.log('');

  const keypair = loadSignerKeypair();
  console.log(`🔑 Using signer: ${keypair.publicKey.toBase58()}`);
  console.log('');

  const results = await Promise.allSettled(
    HARMONIC_REGIONS.map((r) => authenticateWithRegion(r.name, r.url, keypair))
  );

  const regionResults = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { region: 'unknown', success: false, latencyMs: 0 }
  );

  const successful = regionResults.filter((r) => r.success).sort((a, b) => a.latencyMs - b.latencyMs);
  const failed = regionResults.filter((r) => !r.success);

  console.log('✅ Authenticated regions:');
  successful.forEach((r) => {
    console.log(`   ${r.region}: ${r.latencyMs}ms`);
  });

  if (failed.length > 0) {
    console.log('');
    console.log('❌ Failed regions:');
    failed.forEach((r) => {
      console.log(`   ${r.region}: ${r.error}`);
    });
  }

  if (successful.length > 0) {
    console.log('');
    console.log(`🏆 Fastest region: ${successful[0].region} at ${successful[0].latencyMs}ms`);
  }

  return regionResults;
}