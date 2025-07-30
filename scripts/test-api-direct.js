// Test API endpoint directly
// Run this in browser console or visit the URL directly

fetch('/api/leaderboard?limit=10')
  .then(response => {
    console.log('📡 API Response Status:', response.status);
    console.log('📡 API Response Headers:', response.headers);
    return response.json();
  })
  .then(data => {
    console.log('📊 API Response Data:', data);
    console.log('📊 Leaderboard Array:', data.leaderboard);
    console.log('📊 Array Length:', data.leaderboard?.length);
    
    if (data.leaderboard && data.leaderboard.length > 0) {
      console.log('✅ API is returning data correctly');
      console.log('👤 First player:', data.leaderboard[0]);
    } else {
      console.log('❌ API returned empty data');
    }
  })
  .catch(error => {
    console.error('🚨 API Error:', error);
  });

// Also check what the dashboard is receiving
console.log('🔍 Checking current page state...');
console.log('🔍 Current URL:', window.location.href);
console.log('🔍 Page title:', document.title);
