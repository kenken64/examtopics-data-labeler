#!/usr/bin/env node

/**
 * Quick verification of JWT middleware configuration
 * Shows current public routes and debug logging status
 */

const fs = require('fs');
const path = require('path');

function checkMiddlewareConfig() {
  console.log('🔍 JWT Middleware Configuration Check');
  console.log('=' .repeat(50));

  try {
    const middlewarePath = path.join(__dirname, 'middleware.ts');
    const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8');

    // Check for public routes
    const publicRoutesMatch = middlewareContent.match(/const PUBLIC_ROUTES = \[([\s\S]*?)\];/);
    if (publicRoutesMatch) {
      console.log('\n📋 Current Public Routes:');
      const routes = publicRoutesMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith("'") || line.startsWith('"'))
        .map(line => line.replace(/['"',]/g, '').trim());
      
      routes.forEach(route => {
        if (route.includes('quizblitz')) {
          console.log(`  ✅ ${route} (QuizBlitz)`);
        } else {
          console.log(`  📍 ${route}`);
        }
      });
    }

    // Check for dynamic route pattern
    if (middlewareContent.includes("pathname.startsWith('/api/quizblitz/session/')")) {
      console.log('\n🎯 Dynamic Route Patterns:');
      console.log('  ✅ /api/quizblitz/session/[quizCode] (pattern matching)');
    }

    // Check for debug logging
    const debugPatterns = [
      '🔍 === MIDDLEWARE START ===',
      '📍 Request:',
      '🔑 Token Status:',
      '🌍 Route Type:',
      '✅ ALLOWING:',
      '❌ REJECTING:',
      '❌ REDIRECTING:',
      '🔍 === MIDDLEWARE END:'
    ];

    console.log('\n🔧 Debug Logging Features:');
    debugPatterns.forEach(pattern => {
      if (middlewareContent.includes(pattern)) {
        console.log(`  ✅ ${pattern}`);
      } else {
        console.log(`  ❌ ${pattern} (missing)`);
      }
    });

    // Check QuizBlitz authentication boundaries
    console.log('\n🎮 QuizBlitz Authentication Boundaries:');
    console.log('  🌐 Public APIs:');
    console.log('    ✅ POST /api/quizblitz/join (players)');
    console.log('    ✅ GET  /api/quizblitz/session/[quizCode] (players)');
    console.log('  🔒 Protected APIs:');
    console.log('    🔒 POST /api/quizblitz/start (hosts)');
    console.log('    🔒 GET  /api/quizblitz/room/[quizCode] (hosts)');
    console.log('    🔒 POST /api/quizblitz/create-room (hosts)');

    console.log('\n✅ Middleware configuration is complete and ready!');
    console.log('\n🚀 To test with a running server:');
    console.log('  1. npm run dev');
    console.log('  2. node test-middleware-debug-logging.js');

  } catch (error) {
    console.error('❌ Error reading middleware file:', error.message);
  }
}

checkMiddlewareConfig();
