/**
 * Import Path Updater Script
 * 
 * This script helps update import paths after restructuring the codebase.
 * It uses regex-based search and replace to update import paths in TypeScript/JavaScript files.
 * 
 * Usage:
 * node scripts/update-imports.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration: Define import path mappings (old -> new)
const importMappings = [
  // Components
  { from: /from ['"](.*)\/components\/app-sidebar['"]/, to: 'from "~/components/layout/Sidebar"' },
  { from: /from ['"](.*)\/components\/nav-user['"]/, to: 'from "~/components/layout/NavUser"' },
  { from: /from ['"](.*)\/components\/team-switcher['"]/, to: 'from "~/components/layout/TeamSwitcher"' },
  { from: /from ['"](.*)\/components\/big-calendar['"]/, to: 'from "~/features/scheduling/components/BigCalendar"' },
  { from: /from ['"](.*)\/components\/hashtag-search['"]/, to: 'from "~/features/social/components/HashtagSearch"' },
  { from: /from ['"](.*)\/components\/hashtag-browser['"]/, to: 'from "~/features/social/components/HashtagBrowser"' },
  
  // Utils
  { from: /from ['"](.*)\/lib\/utils['"]/, to: 'from "~/utils"' },
  { from: /from ['"](.*)\/lib\/audio-utils['"]/, to: 'from "~/utils/audio"' },
  
  // Config
  { from: /from ['"](.*)\/lib\/config\/industry-config['"]/, to: 'from "~/config/industry"' },
  
  // Specific named imports
  { from: /import \{ formatDate \} from ['"](.*)\/lib\/utils['"]/, to: 'import { dateUtils } from "~/utils"\n// Replace with: const { formatDate } = dateUtils;' },
];

// Find all TypeScript/JavaScript files
function findTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory() && file !== 'node_modules' && file !== '.next') {
      results = results.concat(findTsFiles(filePath));
    } else if (
      stat && 
      stat.isFile() && 
      (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx'))
    ) {
      results.push(filePath);
    }
  });
  
  return results;
}

// Update imports in a file
function updateImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  importMappings.forEach(mapping => {
    const oldContent = content;
    content = content.replace(mapping.from, mapping.to);
    
    if (oldContent !== content) {
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated imports in ${filePath}`);
    return 1;
  }
  
  return 0;
}

// Main function
function main() {
  try {
    // Create a backup first
    console.log('Creating backup...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `backup-${timestamp}`;
    
    execSync(`mkdir -p ${backupDir}/src`);
    execSync(`cp -r src/* ${backupDir}/src/`);
    console.log(`Backup created in ./${backupDir}`);
    
    // Find all TS/JS files
    console.log('Finding TypeScript/JavaScript files...');
    const files = findTsFiles('src');
    console.log(`Found ${files.length} files`);
    
    // Update imports
    console.log('Updating imports...');
    let updatedFiles = 0;
    
    files.forEach(file => {
      updatedFiles += updateImportsInFile(file);
    });
    
    console.log(`\nComplete! Updated imports in ${updatedFiles} files.`);
    console.log(`Backup of original files is available in ./${backupDir}`);
    
    // Instructions for manual review
    console.log('\nNext steps:');
    console.log('1. Review the changes manually');
    console.log('2. Fix any remaining import issues');
    console.log('3. Run the application to ensure everything works as expected');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 