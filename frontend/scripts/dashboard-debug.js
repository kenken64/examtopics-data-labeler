/**
 * Dashboard Debug Script
 * 
 * Run this in browser console to debug dashboard loading issues:
 * 
 * Usage:
 * 1. Navigate to dashboard page
 * 2. Open browser console (F12)
 * 3. Copy and paste this script
 * 4. Run: dashboardDebug.runAllChecks()
 */

(function() {
  'use strict';
  
  // Check if dashboard elements exist
  const checkDashboardElements = () => {
    console.log('🔍 Checking dashboard DOM elements...');
    
    const dashboardContainer = document.querySelector('.min-h-screen.bg-gray-100');
    const leaderboardSection = document.querySelector('h2');
    const allH2Elements = document.querySelectorAll('h2');
    
    console.log('Dashboard container found:', !!dashboardContainer);
    console.log('Total H2 elements:', allH2Elements.length);
    
    allH2Elements.forEach((h2, index) => {
      console.log(`H2 ${index + 1}:`, h2.textContent);
    });
    
    // Look for the specific leaderboard section
    const leaderboardH2 = Array.from(allH2Elements).find(h2 => 
      h2.textContent?.includes('Global Leaderboard')
    );
    
    console.log('Global Leaderboard H2 found:', !!leaderboardH2);
    
    if (leaderboardH2) {
      const leaderboardContainer = leaderboardH2.closest('.bg-white');
      console.log('Leaderboard container found:', !!leaderboardContainer);
      
      if (leaderboardContainer) {
        console.log('Leaderboard container styles:', {
          display: getComputedStyle(leaderboardContainer).display,
          visibility: getComputedStyle(leaderboardContainer).visibility,
          opacity: getComputedStyle(leaderboardContainer).opacity,
          height: getComputedStyle(leaderboardContainer).height,
          width: getComputedStyle(leaderboardContainer).width
        });
      }
    }
    
    return {
      dashboardContainer: !!dashboardContainer,
      leaderboardH2: !!leaderboardH2,
      totalH2Elements: allH2Elements.length
    };
  };

  // Check grid layout
  const checkGridLayout = () => {
    console.log('\n🔍 Checking grid layout...');
    
    const gridContainer = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2');
    console.log('Grid container found:', !!gridContainer);
    
    if (gridContainer) {
      const gridItems = gridContainer.children;
      console.log('Grid items count:', gridItems.length);
      
      Array.from(gridItems).forEach((item, index) => {
        const h2 = item.querySelector('h2');
        console.log(`Grid item ${index + 1}:`, h2?.textContent || 'No title');
        console.log(`  - Display:`, getComputedStyle(item).display);
        console.log(`  - Width:`, getComputedStyle(item).width);
      });
    }
    
    return {
      gridContainer: !!gridContainer,
      gridItemsCount: gridContainer?.children.length || 0
    };
  };

  // Check network requests
  const checkNetworkRequests = () => {
    console.log('\n🔍 Checking recent network requests...');
    
    // Look for performance entries
    const entries = performance.getEntries()
      .filter(entry => entry.name.includes('/api/'))
      .slice(-10);
    
    console.log('Recent API calls:');
    entries.forEach(entry => {
      console.log(`  - ${entry.name} (${entry.duration?.toFixed(2)}ms)`);
    });
    
    // Check if fetch requests are working
    console.log('\n🌐 Testing leaderboard API...');
    
    return fetch('/api/leaderboard?limit=10')
      .then(response => {
        console.log('Leaderboard API response status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('Leaderboard API data:', data);
        console.log('Leaderboard length:', data.leaderboard?.length || 0);
        return data;
      })
      .catch(error => {
        console.error('Leaderboard API error:', error);
        return null;
      });
  };

  // Check React component rendering
  const checkReactComponents = () => {
    console.log('\n🔍 Checking React components...');
    
    // Look for React DevTools
    const hasReactDevTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    console.log('React DevTools available:', !!hasReactDevTools);
    
    // Check for common React errors in console
    const consoleErrors = [];
    const originalError = console.error;
    console.error = (...args) => {
      consoleErrors.push(args.join(' '));
      originalError.apply(console, args);
    };
    
    // Check for LeaderboardChart component
    const chartWrappers = document.querySelectorAll('[class*="h-64"]');
    console.log('Chart wrapper elements found:', chartWrappers.length);
    
    chartWrappers.forEach((wrapper, index) => {
      console.log(`Chart wrapper ${index + 1}:`, {
        className: wrapper.className,
        content: wrapper.textContent?.substring(0, 100) || 'No content',
        hasCanvas: !!wrapper.querySelector('canvas'),
        hasChart: !!wrapper.querySelector('[class*="chart"]')
      });
    });
    
    return {
      hasReactDevTools: !!hasReactDevTools,
      chartWrappers: chartWrappers.length,
      consoleErrors: consoleErrors.slice(-5) // Last 5 errors
    };
  };

  // Check for JavaScript errors
  const checkJavaScriptErrors = () => {
    console.log('\n🔍 Checking for JavaScript errors...');
    
    // Set up error listener
    const errors = [];
    window.addEventListener('error', (e) => {
      errors.push({
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno
      });
    });
    
    // Check for unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      errors.push({
        type: 'unhandledrejection',
        reason: e.reason
      });
    });
    
    return {
      errorCount: errors.length,
      recentErrors: errors.slice(-3)
    };
  };

  // Test LeaderboardChart component directly
  const testLeaderboardChart = () => {
    console.log('\n🧪 Testing LeaderboardChart component...');
    
    // Mock data for testing
    const testData = [
      {
        _id: "test1",
        username: "testuser1",
        displayName: "Test User 1", 
        totalPoints: 100,
        quizzesTaken: 5,
        accuracy: 85,
        source: "registered",
        position: 1
      },
      {
        _id: "test2",
        username: "testuser2",
        displayName: "Test User 2",
        totalPoints: 80,
        quizzesTaken: 4,
        accuracy: 75,
        source: "quizblitz",
        position: 2
      }
    ];
    
    console.log('Test data created:', testData);
    
    // Try to find and interact with the component
    const leaderboardSections = document.querySelectorAll('h2');
    let leaderboardSection = null;
    
    leaderboardSections.forEach(h2 => {
      if (h2.textContent?.includes('Global Leaderboard')) {
        leaderboardSection = h2.parentElement;
      }
    });
    
    if (leaderboardSection) {
      console.log('Found leaderboard section, checking content...');
      const debugInfo = leaderboardSection.querySelector('.text-gray-600');
      console.log('Debug info element:', debugInfo?.textContent);
      
      const chartContainer = leaderboardSection.querySelector('[class*="h-64"]');
      console.log('Chart container found:', !!chartContainer);
      
      if (chartContainer) {
        console.log('Chart container content:', chartContainer.textContent);
      }
    } else {
      console.log('❌ Leaderboard section not found in DOM');
    }
    
    return {
      leaderboardSectionFound: !!leaderboardSection,
      testDataValid: testData.length > 0
    };
  };

  // Main debug function
  const runAllChecks = async () => {
    console.log('🚀 Dashboard Debug - Comprehensive Analysis');
    console.log('='.repeat(60));
    
    const domCheck = checkDashboardElements();
    const gridCheck = checkGridLayout();
    const reactCheck = checkReactComponents();
    const jsErrorCheck = checkJavaScriptErrors();
    const chartTest = testLeaderboardChart();
    
    console.log('\n🌐 Testing network requests...');
    const networkData = await checkNetworkRequests();
    
    console.log('\n📊 SUMMARY REPORT:');
    console.log('DOM Elements:', domCheck);
    console.log('Grid Layout:', gridCheck);
    console.log('React Components:', reactCheck);
    console.log('JavaScript Errors:', jsErrorCheck);
    console.log('Chart Test:', chartTest);
    console.log('Network Data:', networkData ? 'SUCCESS' : 'FAILED');
    
    // Final diagnosis
    console.log('\n🎯 DIAGNOSIS:');
    
    if (!domCheck.leaderboardH2) {
      console.log('❌ Issue: Global Leaderboard section not found in DOM');
      console.log('💡 Possible causes: Component not rendering, conditional rendering hiding it');
    } else if (gridCheck.gridItemsCount < 2) {
      console.log('❌ Issue: Grid layout incomplete');
      console.log('💡 Possible causes: CSS grid issues, component mounting problems');
    } else if (!networkData) {
      console.log('❌ Issue: Leaderboard API not responding');
      console.log('💡 Possible causes: API endpoint error, network issues, authentication problems');
    } else if (reactCheck.consoleErrors.length > 0) {
      console.log('❌ Issue: React component errors detected');
      console.log('💡 Check console for component rendering errors');
    } else {
      console.log('✅ All checks passed - investigating deeper...');
    }
    
    return {
      domCheck,
      gridCheck,
      reactCheck,
      jsErrorCheck,
      chartTest,
      networkSuccess: !!networkData
    };
  };

  // Export to global scope
  window.dashboardDebug = {
    runAllChecks,
    checkDashboardElements,
    checkGridLayout,
    checkNetworkRequests,
    checkReactComponents,
    testLeaderboardChart
  };

  console.log('🎯 Dashboard Debug Suite loaded!');
  console.log('📋 Available commands:');
  console.log('   dashboardDebug.runAllChecks() - Run comprehensive analysis');
  console.log('   dashboardDebug.checkDashboardElements() - Check DOM elements');
  console.log('   dashboardDebug.checkGridLayout() - Check grid layout');
  console.log('   dashboardDebug.testLeaderboardChart() - Test chart component');

})();
