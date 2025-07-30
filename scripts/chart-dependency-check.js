// Chart.js Dependency Check
// Run this in browser console on dashboard page

console.log('🔍 Chart.js Dependency Check Started');

// Check if Chart.js is loaded
if (typeof window !== 'undefined') {
  try {
    const Chart = require('chart.js');
    console.log('✅ Chart.js found via require:', Chart);
  } catch (e) {
    console.log('❌ Chart.js not found via require:', e.message);
  }
  
  // Check if it's available globally
  if (window.Chart) {
    console.log('✅ Chart.js available globally:', window.Chart);
  } else {
    console.log('❌ Chart.js not available globally');
  }
  
  // Check react-chartjs-2
  try {
    const { Bar } = require('react-chartjs-2');
    console.log('✅ react-chartjs-2 Bar component found:', Bar);
  } catch (e) {
    console.log('❌ react-chartjs-2 not found:', e.message);
  }
}

// Check if LeaderboardChart component is mounting
const leaderboardElements = document.querySelectorAll('[class*="border-red-300"]');
console.log(`🔍 Found ${leaderboardElements.length} test containers with red border`);

leaderboardElements.forEach((el, index) => {
  console.log(`Container ${index + 1}:`, el);
  console.log(`- Children count: ${el.children.length}`);
  console.log(`- Inner HTML length: ${el.innerHTML.length}`);
  console.log(`- Has canvas: ${el.querySelector('canvas') ? 'YES' : 'NO'}`);
});

// Check React error boundary
const errorElements = document.querySelectorAll('[class*="error"], .error-boundary');
console.log(`🚨 Found ${errorElements.length} error elements`);

// Check console for React errors
const originalError = console.error;
let reactErrors = [];
console.error = function(...args) {
  if (args.some(arg => typeof arg === 'string' && (arg.includes('React') || arg.includes('Chart')))) {
    reactErrors.push(args);
  }
  originalError.apply(console, args);
};

setTimeout(() => {
  console.log(`🚨 React/Chart errors captured: ${reactErrors.length}`);
  reactErrors.forEach((error, index) => {
    console.log(`Error ${index + 1}:`, error);
  });
}, 1000);

console.log('🔍 Chart.js Dependency Check Complete - Check results above');
