#!/bin/bash

# Security Headers Test Script
# Tests if security headers are properly configured

URL=${1:-"http://localhost:3000"}
echo "🔍 Testing security headers for: $URL"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

check_header() {
    local header_name="$1"
    local expected_pattern="$2"
    local header_value=$(curl -s -I "$URL" | grep -i "^$header_name:" | cut -d' ' -f2- | tr -d '\r\n')
    
    if [ -n "$header_value" ]; then
        if [ -n "$expected_pattern" ] && [[ ! "$header_value" =~ $expected_pattern ]]; then
            echo -e "${YELLOW}⚠️  $header_name: $header_value (CHECK CONTENT)${NC}"
        else
            echo -e "${GREEN}✅ $header_name: $header_value${NC}"
        fi
    else
        echo -e "${RED}❌ $header_name: Missing${NC}"
    fi
}

echo "🔒 Security Headers Check:"
echo ""

# Essential security headers
check_header "Content-Security-Policy" "default-src"
check_header "X-Content-Type-Options" "nosniff"
check_header "X-Frame-Options" "DENY|SAMEORIGIN"
check_header "Referrer-Policy" "strict-origin"
check_header "X-XSS-Protection" "1"

echo ""
echo "🌐 Transport Security:"
check_header "Strict-Transport-Security" "max-age"

echo ""
echo "🍪 Cookie Security:"
# Check for secure cookies (this is basic - real check needs to examine Set-Cookie headers)
cookie_headers=$(curl -s -I "$URL" | grep -i "^set-cookie:")
if [ -n "$cookie_headers" ]; then
    echo "Cookie headers found:"
    while IFS= read -r line; do
        if [[ "$line" =~ HttpOnly ]] && [[ "$line" =~ Secure ]]; then
            echo -e "${GREEN}✅ $line${NC}"
        else
            echo -e "${YELLOW}⚠️  $line (Missing security flags)${NC}"
        fi
    done <<< "$cookie_headers"
else
    echo -e "${BLUE}ℹ️  No cookies set${NC}"
fi

echo ""
echo "📊 Additional Headers:"
check_header "Permissions-Policy"
check_header "Cross-Origin-Embedder-Policy"
check_header "Cross-Origin-Opener-Policy"

echo ""
echo "=================================================="
echo "🔍 Full Header Response:"
echo "=================================================="
curl -s -I "$URL" | grep -E "^[A-Za-z-]+:" | sort

echo ""
echo "=================================================="
echo "💡 Recommendations:"
echo "=================================================="
echo "1. Run this against your staging/production URL"
echo "2. Fix any missing security headers"
echo "3. Use https://securityheaders.com/ for detailed analysis"
echo "4. Re-run DAST scan after implementing fixes"

echo ""
echo "🚀 Test different environments:"
echo "  ./test-security-headers.sh http://localhost:3000"
echo "  ./test-security-headers.sh https://your-staging-url.com"
echo "  ./test-security-headers.sh https://your-production-url.com"