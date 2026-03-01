import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.NOZOMI_API_KEY;
const endpoint = process.env.NOZOMI_ENDPOINT;

async function checkNozomi() {
  console.log('🔍 Checking Nozomi connection...');

  if (!apiKey) {
    console.error('❌ No API key found. Check your .env file.');
    return;
  }

  try {
    const response = await fetch(`${endpoint}/ping`, {
      method: 'GET',
    });

    if (response.ok) {
      console.log('✅ Nozomi is live and reachable!');
      console.log('📡 Endpoint:', endpoint);
      console.log('🔑 Key loaded:', apiKey.slice(0, 8) + '...' + apiKey.slice(-4));
      console.log('');
      console.log('Your full submission URL will be:');
      console.log(`${endpoint}/?c=${apiKey}`);
    } else {
      console.log('⚠️ Got a response but unexpected status:', response.status);
    }

  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

checkNozomi();