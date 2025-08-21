#!/bin/bash

# Set target URL (can be overridden by environment variable)
TARGET_URL=${ZAP_TARGET_URL:-"https://frontend-production-1884.up.railway.app/"}

echo "Starting OWASP ZAP DAST scan for: $TARGET_URL"

# Pull latest ZAP image
docker pull zaproxy/zap-stable

# Run ZAP baseline scan with additional options
docker run -v $(pwd):/zap/wrk/:rw \
  -t zaproxy/zap-stable zap-baseline.py \
  -t "$TARGET_URL" \
  -g gen.conf \
  -r zap_baseline_report.html \
  -J zap_baseline_report.json \
  -w zap_baseline_report.md \
  -l PASS \
  -a \
  -x zap_baseline_report.xml

# Check exit code
EXIT_CODE=$?
echo "ZAP scan completed with exit code: $EXIT_CODE"

# Exit codes: 0=no warnings, 1=warnings, 2=high risk alerts, 3=medium risk alerts
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ No security issues found"
elif [ $EXIT_CODE -eq 1 ]; then
    echo "⚠️  Warnings found - check report"
elif [ $EXIT_CODE -eq 2 ]; then
    echo "🚨 High risk security issues found!"
elif [ $EXIT_CODE -eq 3 ]; then
    echo "⚠️  Medium risk security issues found"
else
    echo "❌ ZAP scan failed with unexpected exit code: $EXIT_CODE"
fi

exit $EXIT_CODE
