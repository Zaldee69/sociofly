#!/usr/bin/env tsx

/**
 * Simple test to check if frontend development server is responsive
 * Usage: npm run test:frontend
 */

import fetch from "node-fetch";

async function testFrontend() {
  try {
    console.log("🧪 Testing frontend server...\n");

    const testPostId = "cmbke6am401fsvx8iulwhw0pz";
    const baseUrl = "http://localhost:3000";

    // Test 1: Check if dev server is running
    console.log("1. Testing if development server is running...");
    try {
      const response = await fetch(baseUrl, {
        timeout: 5000,
      });

      if (response.ok) {
        console.log("✅ Development server is running");
      } else {
        console.log(`⚠️ Server responded with status: ${response.status}`);
      }
    } catch (error: any) {
      console.log("❌ Development server is not running");
      console.log("💡 Please run: npm run dev");
      return;
    }

    // Test 2: Test post detail page
    console.log("\n2. Testing post detail page...");
    try {
      const postUrl = `${baseUrl}/posts/${testPostId}`;
      const response = await fetch(postUrl, {
        timeout: 10000,
      });

      if (response.ok) {
        console.log("✅ Post detail page is accessible");
        console.log(`🔗 URL: ${postUrl}`);
      } else {
        console.log(
          `⚠️ Post detail page responded with status: ${response.status}`
        );
      }
    } catch (error: any) {
      console.log("❌ Failed to access post detail page");
      console.log("Error:", error.message);
    }

    console.log("\n📝 Next Steps:");
    console.log("━".repeat(50));
    console.log("1. Make sure development server is running: npm run dev");
    console.log(`2. Open this URL in browser: ${baseUrl}/posts/${testPostId}`);
    console.log("3. Check browser console for any JavaScript errors");
    console.log("4. Check Network tab to see if tRPC queries are being made");
    console.log("\n🔍 Debug Tips:");
    console.log("- Open browser DevTools (F12)");
    console.log("- Check Console tab for errors");
    console.log("- Check Network tab for failed requests");
    console.log("- Look for analytics query in tRPC requests");
  } catch (error: any) {
    console.error("❌ Error testing frontend:", error.message);
  }
}

// Run the test
testFrontend().catch(console.error);
