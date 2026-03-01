import { loadSignerKeypair, buildJitoTransaction, buildNozomiTransaction, buildHarmonicTransaction } from '../lib/transactionBuilder.js';
console.log('RPC URL:', process.env.HELIUS_RPC_URL);

async function testTransactionBuilder() {
  console.log('🧪 Testing Transaction Builder...');
  console.log('');

  // Load keypair
  const keypair = loadSignerKeypair();
  console.log(`🔑 Signer: ${keypair.publicKey.toBase58()}`);
  console.log('');

  // Test 1: Build Jito transaction
  console.log('Test 1: Building Jito transaction...');
  const jitoTx = await buildJitoTransaction(keypair, 'competitive');
  console.log(`✅ Jito transaction built`);
  console.log(`   Encoded length: ${jitoTx.encodedTx.length} chars`);
  console.log('');

  // Test 2: Build Nozomi transaction
  console.log('Test 2: Building Nozomi transaction...');
  const nozomiTx = await buildNozomiTransaction(keypair, 'competitive');
  console.log(`✅ Nozomi transaction built`);
  console.log(`   Encoded length: ${nozomiTx.encodedTx.length} chars`);
  console.log('');

  // Test 3: Build Harmonic transaction
  console.log('Test 3: Building Harmonic transaction...');
  const harmonicTx = await buildHarmonicTransaction(keypair, 10000);
  console.log(`✅ Harmonic transaction built`);
  console.log(`   Encoded length: ${harmonicTx.encodedTx.length} chars`);
  console.log('');

  console.log('🎉 Transaction builder working correctly!');
  console.log('');
  console.log('⚠️  Note: These are test transactions (self transfers).');
  console.log('   They will not be submitted to the network yet.');
}

testTransactionBuilder();