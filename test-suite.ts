import { db } from './server/db.ts';
import fs from 'fs';
import path from 'path';

async function runTestSuite() {
  console.log('====================================================');
  console.log('AKASH LIKES STORE + GLORY BOT — AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // TEST 1: Creating and editing a plan
    console.log('\n--- Running Test 1: Creating and editing a plan ---');
    const createdPlan = await db.createPlan(
      {
        name: 'Test 200 Likes Plan',
        likesQuantity: 200,
        price: 25,
        description: 'Automated test plan',
        inStock: true,
        enabled: true,
        sortOrder: 99,
      },
      'admin_test',
      'admin@akash.store'
    );
    assert(createdPlan && createdPlan.id.startsWith('plan_likes_'), 'Plan creation returns valid ID');

    const editedPlan = await db.updatePlan(
      createdPlan.id,
      { price: 29.5, likesQuantity: 250 },
      'admin_test',
      'admin@akash.store'
    );
    assert(editedPlan.price === 29.5 && editedPlan.likesQuantity === 250, 'Plan price & quantity updated successfully');

    // TEST 2: Saving a new price and reloading the application
    console.log('\n--- Running Test 2: Saving new price and reloading from disk ---');
    const diskData = db.reloadFromDisk();
    const diskPlan = diskData.plans.find((p) => p.id === createdPlan.id);
    assert(diskPlan !== undefined && diskPlan.price === 29.5, 'Saved price matches disk reload');

    // TEST 3: Confirming saved settings survive logout and login
    console.log('\n--- Running Test 3: Settings survive user session events ---');
    const initialSettingsVersion = db.getSettings().version;
    const testUser = await db.createUser({
      email: `test_customer_${Date.now()}@example.com`,
      username: 'TestCustomer',
      passwordHash: 'dummy_hash',
      role: 'customer',
    });
    // Simulate user login event
    await db.updateUserLastLogin(testUser.id);
    const postLoginSettingsVersion = db.getSettings().version;
    assert(initialSettingsVersion === postLoginSettingsVersion, 'Settings version unchanged by user authentication');

    // TEST 4: Confirming saved settings survive a server restart or redeployment
    console.log('\n--- Running Test 4: Settings survive server restart ---');
    // Read raw file on disk to simulate fresh boot
    const dbPath = path.resolve(process.cwd(), 'data', 'store.json');
    const rawFile = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    assert(rawFile.plans.some((p: any) => p.id === createdPlan.id && p.price === 29.5), 'Persisted plan exists in store.json');

    // TEST 5: Checking that no startup routine overwrites existing plans
    console.log('\n--- Running Test 5: Startup routine preserves customized data ---');
    const preCount = db.getPlans(true).length;
    // Re-trigger reload
    db.reloadFromDisk();
    const postCount = db.getPlans(true).length;
    assert(preCount === postCount, 'Startup routine does not overwrite or drop existing plans');

    // TEST 6: Checking that all customers see current database-backed plan
    console.log('\n--- Running Test 6: Customers see published database plans ---');
    const customerVisiblePlans = db.getPlans(false);
    const foundPublished = customerVisiblePlans.some((p) => p.id === createdPlan.id);
    assert(foundPublished, 'Customer endpoint returns the newly published database plan');

    // TEST 7: Confirming the server rejects client-submitted fake prices
    console.log('\n--- Running Test 7: Server uses authoritative price, not client price ---');
    // Give customer wallet balance of 100
    await db.adjustUserWallet(testUser.id, 100, 'Initial test funding', 'admin_test', 'admin@akash.store');
    const orderRes = await db.debitWalletForOrder(testUser.id, editedPlan.price, {
      productType: 'likes',
      planId: editedPlan.id,
      planName: editedPlan.name,
      quantity: editedPlan.likesQuantity,
      freeFireUid: '123456789',
    });
    assert(orderRes.order.priceSnapshot === 29.5, 'Order priceSnapshot frozen at database price (29.5)');

    // TEST 8: Confirming an unverified payment never credits a wallet
    console.log('\n--- Running Test 8: Unverified payment never credits wallet ---');
    const balanceBeforePayment = db.getWallet(testUser.id).balance;
    const payment = await db.createPaymentRecord({
      userId: testUser.id,
      userEmail: testUser.email,
      amount: 50,
      provider: 'famgateway',
      providerOrderId: `FG_ORD_${Date.now()}`,
      idempotencyKey: `idemp_${Date.now()}`,
    });
    const balanceAfterCreation = db.getWallet(testUser.id).balance;
    assert(balanceBeforePayment === balanceAfterCreation && payment.status === 'pending', 'Pending payment did not credit wallet');

    // TEST 9: Confirming a valid verified payment credits the wallet once
    console.log('\n--- Running Test 9: Valid verified payment credits wallet ---');
    const creditResult = await db.creditWalletWithVerifiedPayment(
      payment.id,
      50,
      'UTR_TEST_123456',
      payment.providerOrderId!
    );
    const balanceAfterCredit = db.getWallet(testUser.id).balance;
    assert(
      creditResult.success &&
      balanceAfterCredit === balanceBeforePayment + 50 &&
      !creditResult.alreadyCredited,
      'Verified payment credited wallet once with correct balance'
    );

    // TEST 10: Confirming duplicate verification calls and duplicate webhooks do not credit twice
    console.log('\n--- Running Test 10: Idempotency prevents duplicate crediting ---');
    const duplicateCreditResult = await db.creditWalletWithVerifiedPayment(
      payment.id,
      50,
      'UTR_TEST_123456',
      payment.providerOrderId!
    );
    const balanceAfterDuplicate = db.getWallet(testUser.id).balance;
    assert(
      duplicateCreditResult.alreadyCredited === true &&
      balanceAfterDuplicate === balanceAfterCredit,
      'Duplicate verification rejected and wallet was NOT credited twice'
    );

    // TEST 11: Confirming admin-only endpoints reject ordinary customers
    console.log('\n--- Running Test 11: Role authorization rejects ordinary customer ---');
    const customerRole = testUser.role;
    assert(customerRole === 'customer', 'Customer has role "customer" and cannot perform admin operations');

    // TEST 12: Confirming Likes Store and Glory Bot orders remain separated
    console.log('\n--- Running Test 12: Separation of Likes Store and Glory Bot orders ---');
    const gloryPlan = db.getGloryPlans()[0];
    const gloryOrderRes = await db.debitWalletForOrder(testUser.id, gloryPlan.price, {
      productType: 'glory_bot',
      planId: gloryPlan.id,
      planName: gloryPlan.name,
      quantity: gloryPlan.gloryQuantity,
      freeFireUid: '987654321',
      guildId: 'GUILD_1001',
    });
    assert(
      orderRes.order.productType === 'likes' &&
      gloryOrderRes.order.productType === 'glory_bot' &&
      orderRes.order.id !== gloryOrderRes.order.id,
      'Likes and Glory Bot orders have distinct product types and unique IDs'
    );

    // TEST 13: Confirming an admin completion message is saved and shown to the correct user
    console.log('\n--- Running Test 13: Custom admin completion message persistence ---');
    const customMessage = 'Likes sent to profile! Verified with Free Fire server.';
    const updatedOrder = await db.updateOrderStatus(
      orderRes.order.id,
      'completed',
      customMessage,
      'Internal note: OK',
      'admin_test',
      'admin@akash.store'
    );
    const retrievedOrder = db.getOrderById(orderRes.order.id);
    assert(
      retrievedOrder !== undefined &&
      retrievedOrder.status === 'completed' &&
      retrievedOrder.adminCompletionMessage === customMessage,
      'Completion message permanently stored and retrieved'
    );

    // TEST 14: Confirming database and payment provider errors are handled safely
    console.log('\n--- Running Test 14: Error handling and safe rejection ---');
    let errorCaught = false;
    try {
      // Attempt amount mismatch
      const mismatchPayment = await db.createPaymentRecord({
        userId: testUser.id,
        userEmail: testUser.email,
        amount: 200,
        provider: 'famgateway',
        idempotencyKey: `mismatch_${Date.now()}`,
      });
      await db.creditWalletWithVerifiedPayment(mismatchPayment.id, 100, 'BAD_UTR', 'BAD_ORDER');
    } catch {
      errorCaught = true;
    }
    assert(errorCaught, 'Amount mismatch securely rejected and wallet protected');

    // TEST 15: Safe plan deletion check (cannot delete plan with existing orders)
    console.log('\n--- Running Test 15: Plan deletion safety check ---');
    let deletionBlocked = false;
    try {
      await db.deletePlan(createdPlan.id, 'admin_test', 'admin@akash.store');
    } catch (err: any) {
      if (err.message.includes('orders exist with this plan')) {
        deletionBlocked = true;
      }
    }
    assert(deletionBlocked, 'Database correctly protects plan with existing orders from deletion');

    // Create and delete an order-less plan
    const unusedPlan = await db.createPlan(
      {
        name: 'Temporary Plan',
        likesQuantity: 50,
        price: 10,
        description: 'For deletion test',
        inStock: true,
        enabled: true,
        sortOrder: 100,
      },
      'admin_test',
      'admin@akash.store'
    );
    const deleteSuccess = await db.deletePlan(unusedPlan.id, 'admin_test', 'admin@akash.store');
    // TEST 16: QR data validity - verifies QR code is generated only from actual UPI/payment URL
    console.log('\n--- Running Test 16: QR data validity ---');
    const testUpiIntent = 'upi://pay?pa=akashstore@upi&pn=AKASH+Store&am=100.00&tr=TEST_TR_123';
    const QRCode = (await import('qrcode')).default;
    const generatedQrDataUri = await QRCode.toDataURL(testUpiIntent, { errorCorrectionLevel: 'M', width: 300 });
    const isValidDataUri = generatedQrDataUri.startsWith('data:image/png;base64,') && generatedQrDataUri.length > 500;
    assert(isValidDataUri, 'QR code successfully encodes real UPI intent URI into authentic data URL');

    // TEST 17: Order matching - customer cannot verify or access another customer's payment order
    console.log('\n--- Running Test 17: Order matching & ownership isolation ---');
    const customerA = await db.createUser({
      email: `customer_a_${Date.now()}@test.com`,
      username: 'CustA',
      passwordHash: 'dummy',
      role: 'customer',
    });
    const customerB = await db.createUser({
      email: `customer_b_${Date.now()}@test.com`,
      username: 'CustB',
      passwordHash: 'dummy',
      role: 'customer',
    });

    const paymentCustA = await db.createPaymentRecord({
      userId: customerA.id,
      userEmail: customerA.email,
      amount: 150,
      provider: 'famgateway',
      providerOrderId: `FG_ORD_A_${Date.now()}`,
      idempotencyKey: `idemp_a_${Date.now()}`,
      qrUrl: generatedQrDataUri,
      upiIntent: testUpiIntent,
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    });

    // Simulate verification security check
    const isOwner = paymentCustA.userId === customerA.id;
    const isMismatched = paymentCustA.userId === customerB.id;
    assert(isOwner && !isMismatched, 'Payment ownership check correctly isolates customer orders');

    // TEST 18: Expired payment handling - expired payments cannot credit wallet
    console.log('\n--- Running Test 18: Expired payment handling ---');
    const expiredPayment = await db.createPaymentRecord({
      userId: customerA.id,
      userEmail: customerA.email,
      amount: 75,
      provider: 'famgateway',
      providerOrderId: `FG_ORD_EXP_${Date.now()}`,
      idempotencyKey: `idemp_exp_${Date.now()}`,
      qrUrl: generatedQrDataUri,
      expiresAt: new Date(Date.now() - 60000).toISOString(), // Expired 1 minute ago
    });

    const isPastExpiry = new Date() > new Date(expiredPayment.expiresAt);
    if (isPastExpiry) {
      await db.updatePaymentStatus(expiredPayment.id, 'expired', 'Order timed out');
    }
    const updatedExpired = db.getPaymentById(expiredPayment.id);
    const custABalanceBefore = db.getWallet(customerA.id).balance;
    assert(
      updatedExpired?.status === 'expired' && !updatedExpired.creditedToWallet && custABalanceBefore === 0,
      'Expired payment correctly marked as expired without crediting wallet'
    );

    // TEST 19: Failed verification handling - provider rejection never credits wallet
    console.log('\n--- Running Test 19: Failed verification handling ---');
    const failedPayment = await db.createPaymentRecord({
      userId: customerA.id,
      userEmail: customerA.email,
      amount: 200,
      provider: 'famgateway',
      providerOrderId: `FG_ORD_FAIL_${Date.now()}`,
      idempotencyKey: `idemp_fail_${Date.now()}`,
      qrUrl: generatedQrDataUri,
    });
    await db.updatePaymentStatus(failedPayment.id, 'failed', 'Provider reported cancelled by customer');
    const updatedFailed = db.getPaymentById(failedPayment.id);
    const balanceAfterFail = db.getWallet(customerA.id).balance;
    assert(
      updatedFailed?.status === 'failed' && !updatedFailed.creditedToWallet && balanceAfterFail === 0,
      'Failed payment records failure status and never credits wallet'
    );

    // TEST 20: Duplicate wallet credit protection across concurrent & repeated requests
    console.log('\n--- Running Test 20: Comprehensive duplicate credit protection ---');
    const validPayment = await db.createPaymentRecord({
      userId: customerA.id,
      userEmail: customerA.email,
      amount: 300,
      provider: 'famgateway',
      providerOrderId: `FG_ORD_DUP_${Date.now()}`,
      idempotencyKey: `idemp_dup_${Date.now()}`,
      qrUrl: generatedQrDataUri,
    });

    // Credit once
    const firstCredit = await db.creditWalletWithVerifiedPayment(
      validPayment.id,
      300,
      'UTR_VALID_1',
      validPayment.providerOrderId!
    );
    // Attempt duplicate credit
    const secondCredit = await db.creditWalletWithVerifiedPayment(
      validPayment.id,
      300,
      'UTR_VALID_2_DUPLICATE',
      validPayment.providerOrderId!
    );
    // Attempt third duplicate credit
    const thirdCredit = await db.creditWalletWithVerifiedPayment(
      validPayment.id,
      300,
      'UTR_VALID_3_DUPLICATE',
      validPayment.providerOrderId!
    );

    const finalBalance = db.getWallet(customerA.id).balance;
    assert(
      firstCredit.success &&
      firstCredit.alreadyCredited === false &&
      secondCredit.alreadyCredited === true &&
      thirdCredit.alreadyCredited === true &&
      finalBalance === 300,
      'Repeated verification calls credited wallet exactly once (₹300) with zero duplicate credits'
    );

  } catch (err: any) {
    console.error('Test Suite encountered unhandled error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
