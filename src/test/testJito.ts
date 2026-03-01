import { getJitoTipFloor, getRandomTipAccount } from '../lib/jito.js';

async function testJito() {
  console.log('🧪 Testing Jito module...');
  console.log('');

  // Test 1: Fetch live tip floor
  console.log('Test 1: Fetching live tip floor from Jito...');
  const tips = await getJitoTipFloor();
  console.log('');
  console.log('💰 Current Jito Tip Levels:');
  console.log(`   Minimum    (25th): ${tips.min} SOL`);
  console.log(`   Median     (50th): ${tips.median} SOL`);
  console.log(`   Competitive(75th): ${tips.competitive} SOL`);
  console.log(`   High       (95th): ${tips.high} SOL`);
  console.log(`   Urgent     (99th): ${tips.urgent} SOL`);
  console.log('');

  // Test 2: Get a random tip account
  console.log('Test 2: Getting random Jito tip account...');
  const tipAccount = getRandomTipAccount();
  console.log(`✅ Tip account: ${tipAccount}`);
  console.log('');

  console.log('🎉 Jito module is working correctly!');
}

testJito();