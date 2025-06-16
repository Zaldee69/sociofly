#!/usr/bin/env node

/**
 * Comprehensive test script for all fixes implemented
 * Tests both post deletion cleanup and hydration error fixes
 */

const { spawn } = require('child_process');
const path = require('path');

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running ${scriptName}...\n`);
    
    const child = spawn('npm', ['run', scriptName], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${scriptName} completed successfully\n`);
        resolve(true);
      } else {
        console.log(`\n❌ ${scriptName} failed with exit code ${code}\n`);
        resolve(false);
      }
    });

    child.on('error', (error) => {
      console.error(`\n❌ Error running ${scriptName}:`, error);
      resolve(false);
    });
  });
}

async function testAllFixes() {
  console.log('🧪 Comprehensive Test Suite for All Fixes');
  console.log('==========================================\n');

  const results = {
    postDeletion: false,
    hydrationFix: false,
    calendarFeatures: false
  };

  // Test 1: Post Deletion Cleanup
  console.log('📋 Test 1: Post Deletion Cleanup');
  console.log('----------------------------------');
  results.postDeletion = await runScript('test-post-deletion');

  // Test 2: Hydration Error Fixes
  console.log('🔄 Test 2: Hydration Error Fixes');
  console.log('----------------------------------');
  results.hydrationFix = await runScript('test-hydration-fix');

  // Test 3: Calendar Features (if available)
  console.log('📅 Test 3: Calendar Features');
  console.log('-----------------------------');
  try {
    results.calendarFeatures = await runScript('test-calendar-features');
  } catch (error) {
    console.log('⚠️  Calendar features test not available or failed');
    results.calendarFeatures = false;
  }

  // Summary Report
  console.log('\n🎉 COMPREHENSIVE TEST RESULTS');
  console.log('==============================\n');

  console.log('📊 Test Summary:');
  console.log(`   ${results.postDeletion ? '✅' : '❌'} Post Deletion Cleanup: ${results.postDeletion ? 'PASSED' : 'FAILED'}`);
  console.log(`   ${results.hydrationFix ? '✅' : '❌'} Hydration Error Fixes: ${results.hydrationFix ? 'PASSED' : 'FAILED'}`);
  console.log(`   ${results.calendarFeatures ? '✅' : '⚠️ '} Calendar Features: ${results.calendarFeatures ? 'PASSED' : 'SKIPPED/FAILED'}`);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n📈 Overall Score: ${passedTests}/${totalTests} tests passed`);

  if (results.postDeletion && results.hydrationFix) {
    console.log('\n🎊 CORE FIXES SUCCESSFUL!');
    console.log('\n✅ Key Issues Resolved:');
    console.log('   • Post terjadwal yang dihapus sebelum dipublish sudah ditangani');
    console.log('   • Schedule job cleanup sudah diimplementasi');
    console.log('   • Audit logging untuk post deletion sudah berfungsi');
    console.log('   • Hydration error sudah diperbaiki dengan mounting guards');
    console.log('   • Client-side rendering consistency sudah diterapkan');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Test aplikasi di browser untuk memverifikasi tidak ada hydration warnings');
    console.log('   2. Test delete post terjadwal di UI untuk memastikan berfungsi dengan baik');
    console.log('   3. Monitor console browser untuk error yang tersisa');
    console.log('   4. Test dengan berbagai ukuran layar dan state user');
    
    if (results.calendarFeatures) {
      console.log('   5. ✅ Calendar features juga berfungsi dengan baik');
    } else {
      console.log('   5. ⚠️  Review calendar features jika diperlukan');
    }
  } else {
    console.log('\n🔧 SOME ISSUES NEED ATTENTION');
    
    if (!results.postDeletion) {
      console.log('\n❌ Post Deletion Issues:');
      console.log('   • Check database schema compatibility');
      console.log('   • Verify team and user data exists');
      console.log('   • Review post deletion logic in API routes');
    }
    
    if (!results.hydrationFix) {
      console.log('\n❌ Hydration Error Issues:');
      console.log('   • Review mounting guards implementation');
      console.log('   • Check client component declarations');
      console.log('   • Verify consistent rendering between server and client');
    }
  }

  console.log('\n📚 Documentation:');
  console.log('   • Post deletion: Implemented audit logging and scheduler skip logic');
  console.log('   • Hydration fixes: Added mounting guards to prevent SSR/client mismatch');
  console.log('   • Error handling: Improved error messages and user feedback');

  return results.postDeletion && results.hydrationFix;
}

// Run all tests
testAllFixes()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }); 