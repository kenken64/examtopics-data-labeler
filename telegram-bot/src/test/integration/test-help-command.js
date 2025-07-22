// Test script to validate the help command functionality
// Run this script with: node test-help-command.js

const fs = require('fs');
const path = require('path');

// Read the bot.js file and extract the help message
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

// Validate help message structure
function validateHelpMessage(helpMessage) {
  const validationResults = {
    hasTitle: false,
    hasCommands: false,
    hasExamples: false,
    hasQuizFeatures: false,
    hasTips: false,
    commandsFound: [],
    errors: []
  };

  if (!helpMessage) {
    validationResults.errors.push('Could not extract help message from bot.js');
    return validationResults;
  }

  // Check for main sections
  validationResults.hasTitle = helpMessage.includes('IT Certification Quiz Bot - Help Guide');
  validationResults.hasCommands = helpMessage.includes('Available Commands:');
  validationResults.hasQuizFeatures = helpMessage.includes('Quiz Features:');
  validationResults.hasTips = helpMessage.includes('Tips for Best Experience:');

  // Check for specific commands
  const expectedCommands = ['/start', '/help', '/bookmark', '/bookmarks', '/revision'];
  expectedCommands.forEach(cmd => {
    if (helpMessage.includes(cmd)) {
      validationResults.commandsFound.push(cmd);
    }
  });

  // Check for examples
  validationResults.hasExamples = helpMessage.includes('/bookmark 15') || helpMessage.includes('/bookmark 42');

  // Validate completeness
  if (validationResults.commandsFound.length !== expectedCommands.length) {
    validationResults.errors.push(`Missing commands: ${expectedCommands.filter(cmd => !validationResults.commandsFound.includes(cmd)).join(', ')}`);
  }

  return validationResults;
}

// Run validation
console.log('🧪 Testing Help Command Functionality...\n');

try {
  const helpMessage = extractHelpMessage();
  const validation = validateHelpMessage(helpMessage);

  console.log('📋 Validation Results:');
  console.log(`✅ Has Title: ${validation.hasTitle}`);
  console.log(`✅ Has Commands Section: ${validation.hasCommands}`);
  console.log(`✅ Has Quiz Features: ${validation.hasQuizFeatures}`);
  console.log(`✅ Has Tips Section: ${validation.hasTips}`);
  console.log(`✅ Has Examples: ${validation.hasExamples}`);
  console.log(`✅ Commands Found: ${validation.commandsFound.join(', ')}`);

  if (validation.errors.length > 0) {
    console.log('\n❌ Errors Found:');
    validation.errors.forEach(error => console.log(`   • ${error}`));
  } else {
    console.log('\n🎉 All validations passed! Help command is properly configured.');
  }

  console.log('\n📝 Help Message Preview (first 200 chars):');
  console.log(helpMessage ? helpMessage.substring(0, 200) + '...' : 'Could not extract help message');

} catch (error) {
  console.error('❌ Error during validation:', error.message);
}

console.log('\n🚀 Test completed!');
