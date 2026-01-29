/**
 * Auth System Test Script
 * Run with: npx ts-node scripts/test-auth.ts
 * 
 * This script helps verify the auth system is working correctly.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function testRegistration() {
  console.log("\n📝 Testing Registration...");
  
  const testEmail = `test-${Date.now()}@example.com`;
  
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User",
      email: testEmail,
      password: "TestPass123!",
      confirmPassword: "TestPass123!",
    }),
  });

  const data = await response.json();
  
  if (data.success) {
    console.log("✅ Registration successful");
    console.log(`   Email: ${testEmail}`);
    return testEmail;
  } else {
    console.log("❌ Registration failed:", data.error);
    return null;
  }
}

async function testForgotPassword(email: string) {
  console.log("\n🔑 Testing Forgot Password...");
  
  const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  
  if (data.success) {
    console.log("✅ Forgot password request successful");
  } else {
    console.log("❌ Forgot password failed:", data.error);
  }
}

async function testRateLimit(email: string) {
  console.log("\n⏱️ Testing Rate Limiting...");
  
  for (let i = 1; i <= 7; i++) {
    const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    console.log(`   Attempt ${i}: ${data.success ? "✅" : "❌"} ${data.message || data.error || ""}`);
    
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function testResendVerification(email: string) {
  console.log("\n📧 Testing Resend Verification...");
  
  const response = await fetch(`${BASE_URL}/api/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  
  if (data.success) {
    console.log("✅ Resend verification successful");
  } else {
    console.log("❌ Resend verification failed:", data.error);
  }
}

async function runTests() {
  console.log("🚀 Starting Auth System Tests");
  console.log("================================");
  console.log(`Base URL: ${BASE_URL}`);
  
  // Test registration
  const testEmail = await testRegistration();
  
  if (testEmail) {
    // Test forgot password
    await testForgotPassword(testEmail);
    
    // Test resend verification
    await testResendVerification(testEmail);
    
    // Test rate limiting (optional - uncomment to test)
    // await testRateLimit(testEmail);
  }
  
  console.log("\n================================");
  console.log("🏁 Tests completed!");
  console.log("\nManual tests to perform:");
  console.log("1. Check email inbox for verification email");
  console.log("2. Click verification link");
  console.log("3. Try logging in");
  console.log("4. Test password reset flow");
  console.log("5. Test Google OAuth");
}

runTests().catch(console.error);
