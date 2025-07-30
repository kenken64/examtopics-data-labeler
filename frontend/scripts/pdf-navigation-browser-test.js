/**
 * PDF Page Navigation Browser Test Runner
 * 
 * Run this in browser console to test PDF navigation functionality:
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire file
 * 3. Run: pdfNavTest.runAllTests()
 */

(function() {
  'use strict';
  
  // Test validation logic
  const validatePageNumber = (pageNum, numPages) => {
    if (isNaN(pageNum)) {
      return { isValid: false };
    }
    
    if (pageNum < 1) {
      return { isValid: false, correctedPage: 1 };
    }
    
    if (pageNum > numPages) {
      return { isValid: false, correctedPage: numPages };
    }
    
    return { isValid: true };
  };

  // Test cases for page validation
  const runPageValidationTests = () => {
    console.log('🧪 Running PDF Page Navigation Tests...');
    
    const testCases = [
      // Valid cases
      { input: 1, numPages: 10, expected: { isValid: true }, description: 'Valid page 1' },
      { input: 5, numPages: 10, expected: { isValid: true }, description: 'Valid middle page' },
      { input: 10, numPages: 10, expected: { isValid: true }, description: 'Valid last page' },
      
      // Invalid cases - too low
      { input: 0, numPages: 10, expected: { isValid: false, correctedPage: 1 }, description: 'Page 0 (below minimum)' },
      { input: -1, numPages: 10, expected: { isValid: false, correctedPage: 1 }, description: 'Negative page number' },
      { input: -999, numPages: 10, expected: { isValid: false, correctedPage: 1 }, description: 'Large negative number' },
      
      // Invalid cases - too high
      { input: 11, numPages: 10, expected: { isValid: false, correctedPage: 10 }, description: 'Page beyond maximum' },
      { input: 999, numPages: 10, expected: { isValid: false, correctedPage: 10 }, description: 'Very large page number' },
      
      // Edge cases
      { input: 1, numPages: 1, expected: { isValid: true }, description: 'Single page document' },
      { input: 2, numPages: 1, expected: { isValid: false, correctedPage: 1 }, description: 'Invalid page in single page doc' },
      
      // NaN cases
      { input: NaN, numPages: 10, expected: { isValid: false }, description: 'NaN input' }
    ];
    
    let passed = 0;
    let failed = 0;
    
    testCases.forEach((testCase, index) => {
      const result = validatePageNumber(testCase.input, testCase.numPages);
      const isTestPassed = 
        result.isValid === testCase.expected.isValid &&
        result.correctedPage === testCase.expected.correctedPage;
      
      if (isTestPassed) {
        console.log(`✅ Test ${index + 1}: ${testCase.description}`);
        passed++;
      } else {
        console.log(`❌ Test ${index + 1}: ${testCase.description}`);
        console.log(`   Expected:`, testCase.expected);
        console.log(`   Got:`, result);
        failed++;
      }
    });
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    
    return { passed, failed, total: testCases.length };
  };

  // Performance test for rapid page changes
  const runPerformanceTests = () => {
    console.log('\n⚡ Running Performance Tests...');
    
    const testRapidPageChanges = (numPages = 100) => {
      const startTime = performance.now();
      
      for (let i = 1; i <= numPages; i++) {
        const result = validatePageNumber(i, numPages);
        if (!result.isValid) {
          console.log(`❌ Performance test failed at page ${i}`);
          return false;
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`✅ Validated ${numPages} pages in ${duration.toFixed(2)}ms`);
      console.log(`   Average: ${(duration / numPages).toFixed(4)}ms per validation`);
      
      return duration < 100; // Should complete in under 100ms
    };
    
    const performanceResults = [
      testRapidPageChanges(10),
      testRapidPageChanges(100),
      testRapidPageChanges(1000)
    ];
    
    const allPassed = performanceResults.every(result => result);
    console.log(`\n📊 Performance Tests: ${allPassed ? 'PASSED' : 'FAILED'}`);
    
    return allPassed;
  };

  // Test PDF navigation input field if present on page
  const testLivePdfNavigation = () => {
    console.log('\n🔍 Testing Live PDF Navigation...');
    
    // Look for PDF navigation input
    const pdfInputs = document.querySelectorAll('input[type="number"]');
    let pdfNavInput = null;
    
    // Find the page navigation input (should have min="1" and be in PDF viewer)
    for (const input of pdfInputs) {
      if (input.getAttribute('min') === '1' && input.style.width === '16') {
        pdfNavInput = input;
        break;
      }
    }
    
    if (!pdfNavInput) {
      console.log('❌ PDF navigation input not found on this page');
      return false;
    }
    
    console.log('✅ Found PDF navigation input field');
    
    // Test input validation
    const originalValue = pdfNavInput.value;
    const maxPages = parseInt(pdfNavInput.getAttribute('max') || '10');
    
    console.log(`📄 Testing with max pages: ${maxPages}`);
    
    // Test valid input
    pdfNavInput.value = '1';
    pdfNavInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Test: Valid page 1');
    
    // Test invalid high input
    pdfNavInput.value = (maxPages + 1).toString();
    pdfNavInput.dispatchEvent(new Event('blur', { bubbles: true }));
    console.log(`✅ Test: Invalid page ${maxPages + 1} (should auto-correct)`);
    
    // Test invalid low input
    pdfNavInput.value = '0';
    pdfNavInput.dispatchEvent(new Event('blur', { bubbles: true }));
    console.log('✅ Test: Invalid page 0 (should auto-correct)');
    
    // Restore original value
    pdfNavInput.value = originalValue;
    pdfNavInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('✅ Live PDF navigation tests completed');
    return true;
  };

  // Main test runner
  const runAllTests = () => {
    console.log('🚀 PDF Page Navigation - Browser Test Suite');
    console.log('='.repeat(60));
    
    const validationResults = runPageValidationTests();
    const performanceResults = runPerformanceTests();
    const liveTestResults = testLivePdfNavigation();
    
    console.log('\n📈 FINAL RESULTS:');
    console.log(`Validation Tests: ${validationResults.passed}/${validationResults.total} passed`);
    console.log(`Performance Tests: ${performanceResults ? 'PASSED' : 'FAILED'}`);
    console.log(`Live Tests: ${liveTestResults ? 'PASSED' : 'N/A (no PDF viewer found)'}`);
    
    const overallSuccess = validationResults.failed === 0 && performanceResults;
    console.log(`\n🎯 Overall Status: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    return overallSuccess;
  };

  // Export to global scope
  window.pdfNavTest = {
    runAllTests,
    runPageValidationTests,
    runPerformanceTests,
    testLivePdfNavigation,
    validatePageNumber
  };

  console.log('🎯 PDF Navigation Test Suite loaded!');
  console.log('📋 Available commands:');
  console.log('   pdfNavTest.runAllTests() - Run all tests');
  console.log('   pdfNavTest.runPageValidationTests() - Test validation logic');
  console.log('   pdfNavTest.runPerformanceTests() - Test performance');
  console.log('   pdfNavTest.testLivePdfNavigation() - Test actual PDF input on page');
  console.log('   pdfNavTest.validatePageNumber(5, 10) - Test specific page validation');

})();
