const fs = require('fs');
const path = require('path');

function fixIndentation(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const fixedLines = lines.map(line => {
    // Convert 4 spaces to 2 spaces at the start of lines
    return line.replace(/^( {4})+/, (match) => {
      return '  '.repeat(match.length / 4);
    });
  });
  
  fs.writeFileSync(filePath, fixedLines.join('\n'));
  console.log(`Fixed indentation in ${filePath}`);
}

// Fix all JavaScript files in src directory
const srcDir = './src';

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.js')) {
      fixIndentation(fullPath);
    }
  });
}

processDirectory(srcDir);
console.log('✅ Indentation fixing complete!');
