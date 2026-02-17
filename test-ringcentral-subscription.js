// test-ringcentral-subscription.js
require('dotenv').config();
const ringcentralSubscription = require('./services/ringcentralSubscription');
const { loginRingCentral, checkRingCentralHealth } = require('./config/ringcentral');

async function testRingCentralWebhook() {
  console.log('\n🧪 ===== TESTING RINGCENTRAL WEBHOOK SETUP =====\n');

  try {
    // Step 1: Login to RingCentral
    console.log('📌 Step 1: Logging in to RingCentral...');
    await loginRingCentral();
    console.log('✅ Login successful\n');

    // Step 2: Check health
    console.log('📌 Step 2: Checking health...');
    const health = await checkRingCentralHealth();
    console.log('Health status:', health);
    console.log('✅ Health check passed\n');

    // Step 3: List existing subscriptions
    console.log('📌 Step 3: Listing existing subscriptions...');
    const existingSubs = await ringcentralSubscription.listSubscriptions();
    
    // Step 4: Delete old subscriptions if any (optional)
    if (existingSubs.length > 0) {
      console.log('\n📌 Found existing subscriptions. You may want to delete them:');
      for (const sub of existingSubs) {
        console.log(`   - ${sub.id} (${sub.deliveryMode?.address})`);
      }
    }

    // Step 5: Create new subscription
    console.log('\n📌 Step 5: Creating new webhook subscription...');
    const subscription = await ringcentralSubscription.createSubscription();
    
    console.log('\n✅✅✅ WEBHOOK SETUP COMPLETE! ✅✅✅');
    console.log('\n📋 Subscription Details:');
    console.log('   ID:', subscription.id);
    console.log('   Webhook URL:', subscription.deliveryMode?.address);
    console.log('   Expires:', new Date(subscription.expirationTime).toLocaleString());
    console.log('\n🔔 RingCentral will now send call events to your webhook!');

    // Step 6: Wait a bit and check subscription again
    console.log('\n⏳ Waiting 5 seconds to verify subscription...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const subs = await ringcentralSubscription.listSubscriptions();
    const ourSub = subs.find(s => s.id === subscription.id);
    
    if (ourSub) {
      console.log('\n✅ Subscription verified and active!');
      console.log('   Status:', ourSub.status);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testRingCentralWebhook();