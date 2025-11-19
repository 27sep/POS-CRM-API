// config/ringcentral.js
const RingCentral = require('@ringcentral/sdk').SDK;

let rcsdk;
let platform;

async function loginRingCentral() {
  try {
    rcsdk = new RingCentral({
      server: process.env.RINGCENTRAL_SERVER_URL,
      clientId: process.env.RINGCENTRAL_CLIENT_ID,
      clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET,
    });

    platform = rcsdk.platform();

    // Login using JWT
    await platform.login({ jwt: process.env.RINGCENTRAL_JWT });

    console.log('✅ RingCentral logged in');

    const tokenInfo = platform.auth().data();
    console.log('🔑 Access Token:', tokenInfo?.access_token); // now it will show the actual token

    console.log('✅ RingCentral connected successfully via JWT');
  } catch (error) {
    console.error('❌ RingCentral Login Failed:', error.message);
  }
}

function getPlatform() {
  if (!platform) {
    throw new Error('⚠️ RingCentral platform not initialized. Call loginRingCentral() first.');
  }
  return platform;
}

module.exports = { loginRingCentral, getPlatform };
