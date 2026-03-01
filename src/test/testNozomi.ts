import { getNozomiTipFloor } from '../lib/nozomi.js';

async function testNozomi() {
  console.log('🧪 Testing Nozomi module...');
  console.log('');

  console.log('Test 1: Fetching live tip floor from Nozomi...');
  const tips = await getNozomiTipFloor();
  console.log('');
  console.log('💰 Current Nozomi Tip Levels:');
  console.log(`   Minimum    (25th): ${tips.min} SOL`);
  console.log(`   Median     (50th): ${tips.median} SOL`);
  console.log(`   Competitive(75th): ${tips.competitive} SOL`);
  console.log(`   High       (95th): ${tips.high} SOL`);
  console.log(`   Urgent     (99th): ${tips.urgent} SOL`);
  console.log('');
  console.log('🎉 Nozomi module is working correctly!');
}

testNozomi();