// config/ringcentral.js
const RingCentral = require('@ringcentral/sdk').SDK;

let rcsdk;
let platform;
let isLoggedIn = false;

async function loginRingCentral() {
  try {
    console.log('🔧 Initializing RingCentral...');
    
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

    rcsdk = new RingCentral({
      server: process.env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com',
      clientId: process.env.RINGCENTRAL_CLIENT_ID,
      clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET,
    });

    platform = rcsdk.platform();

    console.log('🔑 Attempting JWT login...');
    
    // Login using JWT
    const authData = await platform.login({ 
      jwt: process.env.RINGCENTRAL_JWT 
    });

    isLoggedIn = true;
    
    const tokenInfo = platform.auth().data();
    console.log('✅ RingCentral logged in successfully');
    console.log('🔑 Access Token:', tokenInfo?.access_token ? '✅ Received' : '❌ Not received');
    console.log('👤 Authorized for extension:', tokenInfo?.owner_id);

    return authData;
  } catch (error) {
    console.error('❌ RingCentral Login Failed:', error.message);
    
    // Provide specific error messages
    if (error.message.includes('Invalid JWT')) {
      console.error('🔍 JWT is invalid or expired. Check your RINGCENTRAL_JWT environment variable.');
    } else if (error.message.includes('client_id')) {
      console.error('🔍 Client ID is invalid. Check RINGCENTRAL_CLIENT_ID.');
    } else if (error.message.includes('credentials')) {
      console.error('🔍 Authentication failed. Check all RingCentral environment variables.');
    }
    
    console.error('💡 Debug Info:', {
      hasClientId: !!process.env.RINGCENTRAL_CLIENT_ID,
      hasClientSecret: !!process.env.RINGCENTRAL_CLIENT_SECRET,
      hasJWT: !!process.env.RINGCENTRAL_JWT,
      server: process.env.RINGCENTRAL_SERVER_URL || 'using default'
    });
    
    isLoggedIn = false;
    throw error; // Re-throw to let caller handle it
  }
}

function getPlatform() {
  if (!platform) {
    throw new Error('⚠️ RingCentral platform not initialized. Call loginRingCentral() first.');
  }
  
  if (!isLoggedIn) {
    console.warn('⚠️ RingCentral platform exists but login status is uncertain');
  }
  
  return platform;
}

// Check if we're logged in (useful for health checks)
function isRingCentralLoggedIn() {
  return isLoggedIn && platform && platform.auth().accessTokenValid();
}

// Refresh token if needed
async function refreshTokenIfNeeded() {
  if (platform && !platform.auth().accessTokenValid()) {
    console.log('🔄 Refreshing RingCentral token...');
    try {
      await platform.refresh();
      console.log('✅ Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      isLoggedIn = false;
      return false;
    }
  }
  return true;
}

module.exports = { 
  loginRingCentral, 
  getPlatform, 
  isRingCentralLoggedIn,
  refreshTokenIfNeeded 
};