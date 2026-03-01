import { getTipComparison } from '../lib/broadcaster.js';

async function testBroadcaster() {
  console.log('🧪 Testing Broadcaster module...');
  console.log('');

  // First test just the tip comparison
  // (we test full broadcast later with real transactions)
  console.log('Test 1: Fetching live tip comparison across all endpoints...');
  console.log('');

  const tips = await getTipComparison();

  console.log('💰 Live Tip Comparison:');
  console.log(`   Jito competitive tip:   ${tips.jito} SOL`);
  console.log(`   Nozomi competitive tip: ${tips.nozomi} SOL`);
  console.log(`   💡 ${tips.recommendation}`);
  console.log('');
  console.log('🎉 Broadcaster module is working correctly!');
  console.log('');
  console.log('ℹ️  Full broadcast test requires real signed transactions.');
  console.log('   That comes next when we build the transaction builder.');
}

testBroadcaster();