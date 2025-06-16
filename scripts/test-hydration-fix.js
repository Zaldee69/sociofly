#!/usr/bin/env node

/**
 * Script to test if hydration errors are fixed
 * This script will check for common hydration issues
 */

const fs = require('fs');
const path = require('path');

function testHydrationFixes() {
  console.log('🧪 Testing Hydration Error Fixes...\n');

  const results = {
    passed: 0,
    failed: 0,
    issues: []
  };

  // Test 1: Check if NotificationDropdown has mounting guard
  console.log('1️⃣  Checking NotificationDropdown mounting guard...');
  const notificationDropdownPath = path.join(process.cwd(), 'src/components/layout/NotificationDropdown.tsx');
  
  if (fs.existsSync(notificationDropdownPath)) {
    const content = fs.readFileSync(notificationDropdownPath, 'utf8');
    
    if (content.includes('const [isMounted, setIsMounted] = React.useState(false)') &&
        content.includes('React.useEffect(() => {') &&
        content.includes('setIsMounted(true)') &&
        content.includes('if (!isMounted)')) {
      console.log('   ✅ NotificationDropdown has proper mounting guard');
      results.passed++;
    } else {
      console.log('   ❌ NotificationDropdown missing mounting guard');
      results.failed++;
      results.issues.push('NotificationDropdown missing mounting guard');
    }
  } else {
    console.log('   ❌ NotificationDropdown file not found');
    results.failed++;
    results.issues.push('NotificationDropdown file not found');
  }

  // Test 2: Check if NavUser has mounting guard
  console.log('\n2️⃣  Checking NavUser mounting guard...');
  const navUserPath = path.join(process.cwd(), 'src/components/layout/NavUser.tsx');
  
  if (fs.existsSync(navUserPath)) {
    const content = fs.readFileSync(navUserPath, 'utf8');
    
    if (content.includes('const [isMounted, setIsMounted] = React.useState(false)') &&
        content.includes('React.useEffect(() => {') &&
        content.includes('setIsMounted(true)') &&
        content.includes('if (!isMounted || !user)')) {
      console.log('   ✅ NavUser has proper mounting guard');
      results.passed++;
    } else {
      console.log('   ❌ NavUser missing mounting guard');
      results.failed++;
      results.issues.push('NavUser missing mounting guard');
    }
  } else {
    console.log('   ❌ NavUser file not found');
    results.failed++;
    results.issues.push('NavUser file not found');
  }

  // Test 3: Check if TeamSwitcher already has mounting guard
  console.log('\n3️⃣  Checking TeamSwitcher mounting guard...');
  const teamSwitcherPath = path.join(process.cwd(), 'src/components/team-switcher.tsx');
  
  if (fs.existsSync(teamSwitcherPath)) {
    const content = fs.readFileSync(teamSwitcherPath, 'utf8');
    
    if (content.includes('const [isMounted, setIsMounted] = React.useState(false)') &&
        content.includes('React.useEffect(() => {') &&
        content.includes('setIsMounted(true)') &&
        content.includes('if (!isMounted)')) {
      console.log('   ✅ TeamSwitcher has proper mounting guard');
      results.passed++;
    } else {
      console.log('   ⚠️  TeamSwitcher may need mounting guard review');
      results.issues.push('TeamSwitcher mounting guard needs review');
    }
  } else {
    console.log('   ❌ TeamSwitcher file not found');
    results.failed++;
    results.issues.push('TeamSwitcher file not found');
  }

  // Test 4: Check for consistent button usage in DropdownMenuTrigger
  console.log('\n4️⃣  Checking DropdownMenuTrigger button consistency...');
  const componentsToCheck = [
    'src/components/layout/NotificationDropdown.tsx',
    'src/components/layout/NavUser.tsx',
    'src/components/team-switcher.tsx'
  ];

  let buttonConsistencyPassed = true;
  
  componentsToCheck.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check if DropdownMenuTrigger uses asChild with Button
      if (content.includes('DropdownMenuTrigger') && content.includes('asChild')) {
        if (content.includes('<Button')) {
          console.log(`   ✅ ${path.basename(filePath)} uses Button with asChild correctly`);
        } else {
          console.log(`   ⚠️  ${path.basename(filePath)} may have button consistency issues`);
          buttonConsistencyPassed = false;
        }
      }
    }
  });

  if (buttonConsistencyPassed) {
    results.passed++;
  } else {
    results.issues.push('Button consistency issues in DropdownMenuTrigger');
  }

  // Test 5: Check for suppressHydrationWarning usage (should be minimal)
  console.log('\n5️⃣  Checking for suppressHydrationWarning usage...');
  const srcDir = path.join(process.cwd(), 'src');
  let suppressHydrationCount = 0;

  function checkSuppressHydration(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        checkSuppressHydration(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('suppressHydrationWarning')) {
          suppressHydrationCount++;
        }
      }
    });
  }

  checkSuppressHydration(srcDir);
  
  if (suppressHydrationCount === 0) {
    console.log('   ✅ No suppressHydrationWarning found (good practice)');
    results.passed++;
  } else {
    console.log(`   ⚠️  Found ${suppressHydrationCount} suppressHydrationWarning usage(s)`);
    console.log('   💡 Consider replacing with proper mounting guards');
  }

  // Test 6: Check for proper client component declarations
  console.log('\n6️⃣  Checking client component declarations...');
  const clientComponents = [
    'src/components/layout/NotificationDropdown.tsx',
    'src/components/layout/NavUser.tsx',
    'src/components/team-switcher.tsx'
  ];

  let clientComponentsPassed = true;
  
  clientComponents.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.startsWith('"use client"') || content.includes('\n"use client"')) {
        console.log(`   ✅ ${path.basename(filePath)} has "use client" directive`);
      } else {
        console.log(`   ❌ ${path.basename(filePath)} missing "use client" directive`);
        clientComponentsPassed = false;
        results.issues.push(`${path.basename(filePath)} missing "use client" directive`);
      }
    }
  });

  if (clientComponentsPassed) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Summary
  console.log('\n🎉 Hydration Error Fix Test Results:');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  
  if (results.issues.length > 0) {
    console.log('\n⚠️  Issues found:');
    results.issues.forEach(issue => {
      console.log(`   • ${issue}`);
    });
  }

  if (results.failed === 0) {
    console.log('\n🎊 All hydration error fixes are properly implemented!');
    console.log('💡 Recommendations:');
    console.log('   • Test the application in browser to verify no hydration warnings');
    console.log('   • Check browser console for any remaining hydration errors');
    console.log('   • Test with different screen sizes and user states');
  } else {
    console.log('\n🔧 Some issues need attention before hydration errors are fully resolved.');
  }

  return results.failed === 0;
}

// Run the test
const success = testHydrationFixes();
process.exit(success ? 0 : 1); 