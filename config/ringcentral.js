const RingCentral = require('@ringcentral/sdk').SDK;

const rcsdk = new RingCentral({
  server: process.env.RINGCENTRAL_SERVER_URL,
  clientId: process.env.RINGCENTRAL_CLIENT_ID,
  clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET,
});

async function loginRingCentral() {
  try {
    const platform = rcsdk.platform();
    await platform.login({ jwt: process.env.RINGCENTRAL_JWT });

    console.log("✅ RingCentral connected successfully via JWT");
    return platform;
  } catch (error) {
    console.error("❌ RingCentral Login Failed:", error.message);
  }
}

module.exports = { loginRingCentral, rcsdk };
