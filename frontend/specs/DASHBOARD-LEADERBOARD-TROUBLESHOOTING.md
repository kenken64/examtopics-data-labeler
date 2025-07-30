# Dashboard Leaderboard Troubleshooting Guide

## 🎯 Issue Analysis: Global Leaderboard Not Showing

### Potential Root Causes

#### 1. **Component Import/Export Issues**
```typescript
// Check if LeaderboardChart is properly imported
import LeaderboardChart from '@/components/charts/LeaderboardChart';

// Verify export in LeaderboardChart.tsx
export default function LeaderboardChart({ data }: LeaderboardChartProps) {
```

#### 2. **API Endpoint Problems**
```javascript
// Test leaderboard API in browser console
fetch('/api/leaderboard?limit=10')
  .then(res => res.json())
  .then(data => console.log('API Response:', data))
  .catch(err => console.error('API Error:', err));
```

#### 3. **Data Loading State Issues**
```typescript
// Check if loading state is stuck
const [loading, setLoading] = useState(true);

// Verify setLoading(false) is called in finally block
finally {
  setLoading(false);
}
```

#### 4. **Conditional Rendering Logic**
```typescript
// Current logic in dashboard
{loading ? (
  <div>Loading...</div>
) : (
  <LeaderboardChart data={...} />
)}
```

#### 5. **CSS/Layout Issues**
```css
/* Check if any CSS is hiding the element */
.hidden { display: none; }
.lg:hidden { /* Hidden on large screens */ }
```

## 🔧 Debugging Steps

### Step 1: Browser Console Checks
```javascript
// 1. Load dashboard debug script
// 2. Run comprehensive check
dashboardDebug.runAllChecks()

// 3. Check specific elements
dashboardDebug.checkDashboardElements()
dashboardDebug.testLeaderboardChart()
```

### Step 2: Network Tab Analysis
1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Look for `/api/leaderboard` request
4. Check response status and data

### Step 3: React DevTools
1. Install React Developer Tools extension
2. Check component tree for LeaderboardChart
3. Verify props being passed to component

### Step 4: Console Error Review
1. Check for JavaScript errors
2. Look for React component errors
3. Verify no import/module resolution errors

## 🚀 Quick Fixes

### Fix 1: Force Component Visibility
```typescript
// Temporarily remove loading condition
<LeaderboardChart data={[
  { /* test data */ }
]} />
```

### Fix 2: Debug Data Flow
```typescript
// Add debug logging
useEffect(() => {
  console.log('Dashboard data loaded:', { dashboardData, leaderboardData, loading });
}, [dashboardData, leaderboardData, loading]);
```

### Fix 3: Verify Grid Layout
```typescript
// Ensure grid container is not collapsed
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[400px]">
```

### Fix 4: Check ChartWrapper Component
```typescript
// Verify ChartWrapper is not blocking rendering
import ChartWrapper, { Bar } from './ChartWrapper';

// Test without ChartWrapper
return <Bar data={chartData} options={options} />;
```

## 🧪 Test Cases

### Test 1: Mock Data Rendering
```typescript
const mockLeaderboardData = [
  {
    _id: "test1",
    username: "testuser1", 
    displayName: "Test User 1",
    totalPoints: 100,
    quizzesTaken: 5,
    accuracy: 85,
    source: "registered" as const,
    position: 1
  }
];
```

### Test 2: API Response Validation
```javascript
// Expected API response structure
{
  leaderboard: [...],
  pagination: {...},
  lastUpdated: "..."
}
```

### Test 3: Component Isolation
```typescript
// Test LeaderboardChart in isolation
<LeaderboardChart data={mockData} />
```

## 📋 Checklist

- [ ] API `/api/leaderboard` returns 200 status
- [ ] LeaderboardChart component exports correctly
- [ ] Dashboard component imports LeaderboardChart
- [ ] Grid layout renders both columns
- [ ] No console JavaScript errors
- [ ] Loading state transitions correctly
- [ ] ChartWrapper component works
- [ ] Chart.js dependencies loaded
- [ ] Mock data renders chart
- [ ] Network requests complete successfully

## 🔍 Browser Debug Commands

```javascript
// 1. Check if dashboard elements exist
document.querySelectorAll('h2').forEach((h2, i) => 
  console.log(`H2 ${i}:`, h2.textContent)
);

// 2. Check grid layout
console.log('Grid items:', 
  document.querySelector('.grid')?.children.length
);

// 3. Test API directly
fetch('/api/leaderboard?limit=5')
  .then(r => r.json())
  .then(d => console.log('API works:', d));

// 4. Check for React errors
console.log('React errors:', 
  window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__?.catchErrors
);
```

## 🎯 Most Likely Issues

1. **API Not Loading Data** - Check network tab for failed requests
2. **Component Import Error** - Verify LeaderboardChart import path
3. **Loading State Stuck** - Check if setLoading(false) is called
4. **Chart.js Library Issue** - Verify chart dependencies loaded
5. **CSS Display Issue** - Check computed styles on element

Run the debug script and check these common issues first!
