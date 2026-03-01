import { authenticateAllRegions } from '../lib/harmonic.js';

async function testHarmonic() {
  console.log('🧪 Testing Harmonic authentication...');
  console.log('');

  await authenticateAllRegions();

  console.log('');
  console.log('🎉 Harmonic authentication test complete!');
}

testHarmonic();