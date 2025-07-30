// Live Dashboard Debug Script
// Paste this in browser console while on dashboard page

console.log('🚀 Starting Live Dashboard Debug');

// 1. Check if we're on the dashboard page
if (!window.location.pathname.includes('dashboard')) {
  console.log('❌ Not on dashboard page. Current path:', window.location.pathname);
} else {
  console.log('✅ On dashboard page');
}

// 2. Check for React error boundaries
const checkForReactErrors = () => {
  const errorBoundaries = document.querySelectorAll('[data-testid*="error"], .error-boundary, [class*="error"]');
  console.log(`🔍 Found ${errorBoundaries.length} potential error elements`);
  
  errorBoundaries.forEach((el, i) => {
    console.log(`Error element ${i + 1}:`, el.innerHTML);
  });
};

// 3. Check for the leaderboard section
const checkLeaderboardSection = () => {
  const leaderboardSections = document.querySelectorAll('h2');
  console.log('📊 All H2 headings found:');
  
  leaderboardSections.forEach((h2, i) => {
    console.log(`  ${i + 1}. "${h2.textContent}"`);
    if (h2.textContent.includes('Leaderboard')) {
      console.log('    ✅ Found Leaderboard section!');
      const container = h2.closest('.bg-white');
      if (container) {
        console.log('    📦 Container dimensions:', {
          width: container.offsetWidth,
          height: container.offsetHeight,
          visible: container.offsetWidth > 0 && container.offsetHeight > 0
        });
        console.log('    📄 Container content length:', container.innerHTML.length);
      }
    }
  });
};

// 4. Check grid layout
const checkGridLayout = () => {
  const gridContainer = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2');
  if (gridContainer) {
    console.log('✅ Grid container found');
    console.log(`   Children count: ${gridContainer.children.length}`);
    console.log(`   Grid computed style:`, window.getComputedStyle(gridContainer).display);
    
    Array.from(gridContainer.children).forEach((child, i) => {
      console.log(`   Child ${i + 1}:`, {
        visible: child.offsetWidth > 0 && child.offsetHeight > 0,
        width: child.offsetWidth,
        height: child.offsetHeight,
        hasContent: child.innerHTML.length > 100
      });
    });
  } else {
    console.log('❌ Grid container not found');
  }
};

// 5. Check for Chart.js
const checkChartJs = () => {
  console.log('📈 Checking Chart.js...');
  
  // Check if Chart.js is loaded globally
  if (typeof window.Chart !== 'undefined') {
    console.log('✅ Chart.js loaded globally');
  } else {
    console.log('❌ Chart.js not found globally');
  }
  
  // Check for canvas elements (charts render to canvas)
  const canvases = document.querySelectorAll('canvas');
  console.log(`📊 Found ${canvases.length} canvas elements`);
  
  canvases.forEach((canvas, i) => {
    console.log(`Canvas ${i + 1}:`, {
      width: canvas.width,
      height: canvas.height,
      visible: canvas.offsetWidth > 0 && canvas.offsetHeight > 0,
      parent: canvas.parentElement?.className
    });
  });
};

// 6. Check our debug elements
const checkDebugElements = () => {
  console.log('🔍 Checking debug elements...');
  
  const debugElements = document.querySelectorAll('[class*="text-red-600"], [class*="text-blue-600"], [class*="text-green-600"]');
  console.log(`Found ${debugElements.length} debug elements`);
  
  debugElements.forEach((el, i) => {
    console.log(`Debug ${i + 1}: "${el.textContent}"`);
  });
  
  // Check for our test border
  const testBorders = document.querySelectorAll('[class*="border-red-300"]');
  console.log(`Found ${testBorders.length} test border elements`);
  
  testBorders.forEach((el, i) => {
    console.log(`Test border ${i + 1}:`, {
      visible: el.offsetWidth > 0 && el.offsetHeight > 0,
      childCount: el.children.length,
      hasChart: !!el.querySelector('canvas')
    });
  });
};

// 7. Run all checks
checkForReactErrors();
checkLeaderboardSection();
checkGridLayout();
checkChartJs();
checkDebugElements();

// 8. Monitor for dynamic changes
let changeCount = 0;
const observer = new MutationObserver((mutations) => {
  changeCount++;
  if (changeCount <= 5) { // Limit logs
    console.log(`🔄 DOM changed (${changeCount}/5):`, mutations.length, 'mutations');
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true
});

// Stop observer after 10 seconds
setTimeout(() => {
  observer.disconnect();
  console.log('🛑 Stopped DOM monitoring');
}, 10000);

console.log('✅ Live Dashboard Debug Complete - Check results above');

// Return some useful functions for manual testing
window.dashboardDebug = {
  recheck: () => {
    checkLeaderboardSection();
    checkGridLayout();
    checkChartJs();
    checkDebugElements();
  },
  findLeaderboard: () => document.querySelector('h2[textContent*="Leaderboard"]'),
  gridChildren: () => {
    const grid = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2');
    return grid ? Array.from(grid.children) : [];
  }
};

console.log('💡 Use window.dashboardDebug.recheck() to run checks again');
