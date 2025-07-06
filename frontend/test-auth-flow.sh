#!/bin/bash

# Test authentication flow
echo "🧪 Testing Authentication Flow"
echo "================================"

BASE_URL="http://localhost:3000"

echo "📡 Testing public endpoints (should work)..."

# Test auth verify endpoint
echo "🔍 Testing /api/auth/verify (no token)..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X GET \
  "$BASE_URL/api/auth/verify" \
  -H "Content-Type: application/json"

echo -e "\n---\n"

# Test protected endpoint without token
echo "🔒 Testing protected endpoint /api/payees (no token)..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X GET \
  "$BASE_URL/api/payees" \
  -H "Content-Type: application/json"

echo -e "\n---\n"

# Test login challenge (public)
echo "🎯 Testing login challenge (public)..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X POST \
  "$BASE_URL/api/auth/passkey/login-challenge" \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser"}'

echo -e "\n---\n"

echo "✅ Authentication tests complete!"
echo ""
echo "🔧 Manual Testing Steps:"
echo "1. Open http://localhost:3000 in browser"
echo "2. Register a new user or use existing credentials"
echo "3. Login with passkey"
echo "4. Check if redirected to /home"
echo "5. Verify you can access protected pages"
echo ""
echo "📊 Expected Results:"
echo "- /api/auth/* endpoints should be accessible (status 200/400)"
echo "- /api/payees without token should return 401"
echo "- After login, should redirect to /home successfully"
