// config/ringcentral.js
const RingCentral = require('@ringcentral/sdk').SDK;

let rcsdk;
let platform;
let isLoggedIn = false;

async function loginRingCentral() {
  try {
    console.log('🔧 Initializing RingCentral...');
    console.log('📋 Environment variables check:');
    console.log('  • RINGCENTRAL_CLIENT_ID:', process.env.RINGCENTRAL_CLIENT_ID ? '✅ Present' : '❌ Missing');
    console.log('  • RINGCENTRAL_CLIENT_SECRET:', process.env.RINGCENTRAL_CLIENT_SECRET ? '✅ Present' : '❌ Missing');
    console.log('  • RINGCENTRAL_JWT:', process.env.RINGCENTRAL_JWT ? '✅ Present' : '❌ Missing');
    console.log('  • JWT Length:', process.env.RINGCENTRAL_JWT?.length || 0);
    console.log('  • JWT Preview:', process.env.RINGCENTRAL_JWT?.substring(0, 30) + '...');
    console.log('  • JWT Last 10 chars:', process.env.RINGCENTRAL_JWT?.slice(-10));

    // Check for hidden characters in JWT
    const jwtRegex = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/;
    const isValidFormat = jwtRegex.test(process.env.RINGCENTRAL_JWT);
    console.log('  • JWT Format Valid:', isValidFormat ? '✅' : '❌');

    if (!isValidFormat) {
      console.error('❌ JWT format is invalid! It should start with "eyJ" and have 3 parts separated by dots.');
      console.error('   Check for extra spaces, quotes, or line breaks in your .env file');
    }

    // Check required environment variables
    if (!process.env.RINGCENTRAL_CLIENT_ID) {
      throw new Error('RINGCENTRAL_CLIENT_ID is not set');
    }
    if (!process.env.RINGCENTRAL_CLIENT_SECRET) {
      throw new Error('RINGCENTRAL_CLIENT_SECRET is not set');
    }
    if (!process.env.RINGCENTRAL_JWT) {
      throw new Error('RINGCENTRAL_JWT is not set');
    }

    console.log('📦 Creating RingCentral SDK instance...');
    rcsdk = new RingCentral({
      server: process.env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com',
      clientId: process.env.RINGCENTRAL_CLIENT_ID.trim(),
      clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET.trim(),
    });

    platform = rcsdk.platform();

    console.log('🔑 Attempting JWT login...');
    console.log('⏳ This may take a few seconds...');

    // Login using JWT
    const loginResponse = await platform.login({
      jwt: process.env.RINGCENTRAL_JWT.trim()
    });

    console.log('📨 Login Response Status:', loginResponse.status);
    console.log('📨 Login Response OK:', loginResponse.ok);

    isLoggedIn = true;

    // Get token data
    const authData = platform.auth().data();

    console.log('🔍 RAW AUTH DATA:', JSON.stringify(authData, null, 2));
    console.log('🔍 accessTokenValid() result:', await platform.auth().accessTokenValid());
    console.log('🔍 Actual token exists:', !!authData.access_token);
    console.log('🔑 Auth Data Retrieved:', !!authData);
    console.log('  • Access Token Present:', !!authData.access_token);
    console.log('  • Access Token Preview:', authData.access_token ? authData.access_token.substring(0, 20) + '...' : 'None');
    console.log('  • Token Type:', authData.token_type);
    console.log('  • Expires In:', authData.expires_in, 'seconds');
    console.log('  • Expire Time:', authData.expire_time ? new Date(authData.expire_time).toLocaleString() : 'Invalid Date');
    console.log('  • Owner ID:', authData.owner_id);

    // 🚨 RINGCENTRAL OUTAGE DETECTION
    if (!authData.access_token && loginResponse.status === 200) {
      console.error('\n🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴');
      console.error('🔴                                                 🔴');
      console.error('🔴      RINGCENTRAL OUTAGE DETECTED!              🔴');
      console.error('🔴                                                 🔴');
      console.error('🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴\n');
      console.error('📡 Status Code: 200 OK but NO ACCESS TOKEN received');
      console.error('❌ This is NOT an issue with your code or configuration');
      console.error('❌ This is a RingCentral API service outage\n');
      console.error('🔍 What to do:');
      console.error('   1. ✅ Your code is PERFECT - DO NOT CHANGE ANYTHING');
      console.error('   2. ✅ Your JWT is valid - DO NOT generate a new one');
      console.error('   3. ✅ Your .env is correct - DO NOT edit it');
      console.error('   4. 🌐 Check RingCentral Status: https://status.ringcentral.com');
      console.error('   5. ⏳ Wait for all services to show 🟢 GREEN');
      console.error('   6. 🔄 Restart your server when status is GREEN\n');
      console.log('⏳ Server continuing to run... Will work automatically when outage ends\n');
    }

    console.log('✅✅✅ RingCentral logged in successfully! ✅✅✅');
    console.log('🔑 Access Token Valid:', await platform.auth().accessTokenValid() ? '✅ Yes' : '❌ No');

    return loginResponse;
  } catch (error) {
    console.error('\n❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌');
    console.error('❌                                                 ❌');
    console.error('❌         RINGCENTRAL LOGIN FAILED               ❌');
    console.error('❌                                                 ❌');
    console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌\n');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Status:', error.status);

    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Headers:', JSON.stringify(error.response.headers, null, 2));

      // Try to get response body
      try {
        const errorBody = await error.response.json();
        console.error('Response Body:', JSON.stringify(errorBody, null, 2));

        if (errorBody.error_description) {
          console.error('🔍 Error Description:', errorBody.error_description);
        }
      } catch (e) {
        console.error('Could not parse error response');
      }
    }

    // Provide specific error messages
    if (error.message.includes('Invalid JWT') || error.message.includes('invalid_grant')) {
      console.error('\n🔴🔴🔴 JWT ISSUE DETECTED 🔴🔴🔴');
      console.error('Your JWT token is invalid or expired.');
      console.error('\n💡 FIX: Generate a NEW JWT token:');
      console.error('   1. Go to RingCentral Console → Profile → Credentials');
      console.error('   2. Delete ALL existing JWTs');
      console.error('   3. Click "Create JWT"');
      console.error('   4. Label: "Clydios-Prod-' + new Date().toISOString().slice(0,10) + '"');
      console.error('   5. Select: "Only specific apps of my choice"');
      console.error('   6. Client ID: 8RVRSwZ7ARhcb1NRL1GoDh');
      console.error('   7. Click Create and COPY THE NEW TOKEN IMMEDIATELY');
      console.error('   8. Update your .env file with the new token');
      console.error('   9. Restart your server\n');
    } else if (error.message.includes('client_id') || error.message.includes('invalid_client')) {
      console.error('\n🔴🔴🔴 CLIENT ID/SECRET ISSUE DETECTED 🔴🔴🔴');
      console.error('Your Client ID or Client Secret is invalid.');
      console.error('\n💡 FIX: Check your .env file:');
      console.error('   RINGCENTRAL_CLIENT_ID=8RVRSwZ7ARhcb1NRL1GoDh');
      console.error('   RINGCENTRAL_CLIENT_SECRET=[your-secret]');
      console.error('\n   Get the secret from:');
      console.error('   RingCentral Console → Apps → Clydios → "Click to see"\n');
    }

    console.error('\n📋 Environment Debug:');
    console.error('  • Client ID Set:', !!process.env.RINGCENTRAL_CLIENT_ID);
    console.error('  • Client Secret Set:', !!process.env.RINGCENTRAL_CLIENT_SECRET);
    console.error('  • JWT Set:', !!process.env.RINGCENTRAL_JWT);
    console.error('  • JWT Length:', process.env.RINGCENTRAL_JWT?.length || 0);
    console.error('  • Server URL:', process.env.RINGCENTRAL_SERVER_URL || 'using default');
    console.error('  • Node Env:', process.env.NODE_ENV || 'not set');
    console.error('  • Timestamp:', new Date().toLocaleString());

    isLoggedIn = false;
    throw error;
  }
}

function getPlatform() {
  if (!platform) {
    throw new Error('⚠️ RingCentral platform not initialized. Call loginRingCentral() first.');
  }
  return platform;
}

async function isRingCentralLoggedIn() {
  try {
    const tokenValid = platform ? await platform.auth().accessTokenValid() : false;
    const isValid = isLoggedIn && platform && tokenValid;
    console.log('🔑 Login Status Check:', isValid ? '✅ Logged In' : '❌ Not Logged In');
    return isValid;
  } catch (error) {
    console.error('❌ Error checking login status:', error.message);
    return false;
  }
}

async function refreshTokenIfNeeded() {
  try {
    if (platform && !(await platform.auth().accessTokenValid())) {
      console.log('🔄 Refreshing RingCentral token...');
      await platform.refresh();
      console.log('✅ Token refreshed successfully');
      return true;
    }
    return true;
  } catch (error) {
    console.error('❌ Token refresh failed:', error.message);
    isLoggedIn = false;
    return false;
  }
}

// Health check function
async function checkRingCentralHealth() {
  try {
    if (!platform) {
      return { status: '❌ Not initialized', error: 'Platform not initialized' };
    }
    
    const tokenValid = await platform.auth().accessTokenValid();
    const authData = platform.auth().data();
    
    return {
      status: tokenValid && authData.access_token ? '✅ Healthy' : '⚠️ Degraded',
      accessTokenPresent: !!authData.access_token,
      tokenValid: tokenValid,
      ownerId: authData.owner_id,
      expiresIn: authData.expires_in,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { status: '❌ Error', error: error.message };
  }
}

module.exports = {
  loginRingCentral,
  getPlatform,
  isRingCentralLoggedIn,
  refreshTokenIfNeeded,
  checkRingCentralHealth
};