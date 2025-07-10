// Test script to validate HTML formatting in help message
// This simulates how Telegram will parse the HTML content

const fs = require('fs');
const path = require('path');

// Function to validate HTML tags are properly closed
function validateHTMLTags(htmlString) {
  const errors = [];
  
  // Check for unclosed bold tags
  const boldOpenTags = (htmlString.match(/<b>/g) || []).length;
  const boldCloseTags = (htmlString.match(/<\/b>/g) || []).length;
  
  if (boldOpenTags !== boldCloseTags) {
    errors.push(`Mismatched <b> tags: ${boldOpenTags} open, ${boldCloseTags} close`);
  }
  
  // Check for proper HTML entity encoding
  if (htmlString.includes('<question_number>')) {
    errors.push('Found unescaped < > characters that should be HTML entities');
  }
  
  // Check that HTML entities are used correctly
  if (!htmlString.includes('&lt;') && htmlString.includes('<question_number>')) {
    errors.push('HTML entities not properly used for < characters');
  }
  
  return errors;
}

// Function to extract help message from bot.js
function extractHelpMessage() {
  const botFilePath = path.join(__dirname, 'bot.js');
  const botContent = fs.readFileSync(botFilePath, 'utf8');
  
  // Find the help message in the handleHelp method
  const helpMethodMatch = botContent.match(/async handleHelp\(ctx\) \{[\s\S]*?const helpMessage =[\s\S]*?`;/);
  
  if (helpMethodMatch) {
    // Extract just the help message content
    const helpContentMatch = helpMethodMatch[0].match(/const helpMessage =\s*`([\s\S]*?)`;/);
    if (helpContentMatch) {
      return helpContentMatch[1];
    }
  }
  
  return null;
}

// Run validation
console.log('🧪 Testing HTML Formatting in Help Message...\n');

try {
  const helpMessage = extractHelpMessage();
  
  if (!helpMessage) {
    console.error('❌ Could not extract help message from bot.js');
    process.exit(1);
  }
  
  console.log('📋 HTML Validation Results:');
  
  // Check parse mode
  const botContent = fs.readFileSync(path.join(__dirname, 'bot.js'), 'utf8');
  const usesHTML = botContent.includes("parse_mode: 'HTML'");
  const usesMarkdown = botContent.includes("parse_mode: 'Markdown'");
  
  console.log(`✅ Uses HTML parse mode: ${usesHTML}`);
  console.log(`❌ Uses Markdown parse mode: ${usesMarkdown}`);
  
  if (!usesHTML) {
    console.log('⚠️  Warning: Help command should use HTML parse mode for reliability');
  }
  
  // Validate HTML structure
  const htmlErrors = validateHTMLTags(helpMessage);
  
  if (htmlErrors.length === 0) {
    console.log('✅ HTML tags are properly formatted');
  } else {
    console.log('❌ HTML formatting errors found:');
    htmlErrors.forEach(error => console.log(`   • ${error}`));
  }
  
  // Check for common Telegram parsing issues
  const problematicChars = [];
  
  if (helpMessage.includes("don't")) {
    problematicChars.push("apostrophe in contractions");
  }
  
  if (helpMessage.includes('<') && !helpMessage.includes('&lt;')) {
    problematicChars.push("unescaped < characters");
  }
  
  if (helpMessage.includes('>') && !helpMessage.includes('&gt;')) {
    problematicChars.push("unescaped > characters");
  }
  
  if (problematicChars.length === 0) {
    console.log('✅ No problematic characters found');
  } else {
    console.log('⚠️  Potential parsing issues:');
    problematicChars.forEach(issue => console.log(`   • ${issue}`));
  }
  
  console.log('\n📝 Sample HTML Output (first 300 chars):');
  console.log(helpMessage.substring(0, 300) + '...');
  
  console.log('\n🎉 HTML formatting validation completed!');
  
} catch (error) {
  console.error('❌ Error during validation:', error.message);
}
