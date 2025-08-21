# DAST Issues Fix Guide

This guide helps you understand and fix common DAST security findings from ZAP scans.

## Common Medium Risk Issues

### 1. Content Security Policy (CSP) Missing or Misconfigured
**ZAP Rule ID:** 10038

**Issue:** Your application doesn't have a proper Content Security Policy header.

**Fix for Next.js:**
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:;"
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

### 2. Cookie Security Flags Missing
**ZAP Rule ID:** 10054

**Issue:** Cookies don't have Secure, HttpOnly, or SameSite flags.

**Fix in your backend/frontend:**
```javascript
// For Next.js API routes
export default function handler(req, res) {
  res.setHeader('Set-Cookie', [
    'sessionId=abc123; HttpOnly; Secure; SameSite=Strict; Path=/',
    'preferences=theme; Secure; SameSite=Lax; Path=/'
  ]);
}
```

### 3. X-Content-Type-Options Missing
**ZAP Rule ID:** 10021

**Issue:** Missing X-Content-Type-Options header.

**Fix:**
```javascript
// next.config.js - add to headers
{
  key: 'X-Content-Type-Options',
  value: 'nosniff'
}
```

### 4. X-Frame-Options Missing
**ZAP Rule ID:** 10020

**Issue:** Missing X-Frame-Options header to prevent clickjacking.

**Fix:**
```javascript
// next.config.js - add to headers
{
  key: 'X-Frame-Options',
  value: 'DENY'
}
```

### 5. Referrer Policy Missing
**ZAP Rule ID:** 10063

**Issue:** No Referrer-Policy header configured.

**Fix:**
```javascript
// next.config.js - add to headers
{
  key: 'Referrer-Policy',
  value: 'strict-origin-when-cross-origin'
}
```

## Complete Next.js Security Headers

Here's a comprehensive security headers configuration:

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:; frame-ancestors 'none';"
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Force HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          // XSS Protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

## Environment-Specific Configurations

### Development/Staging
For non-production environments, you may want to relax some policies:

```javascript
// next.config.js
const isDevelopment = process.env.NODE_ENV === 'development'
const isStaging = process.env.RAILWAY_ENVIRONMENT === 'staging'

const cspPolicy = isDevelopment || isStaging
  ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: wss: https:;"
  : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
```

### Production
For production, use stricter policies and ensure all headers are properly configured.

## Updating ZAP Rules

If certain findings are false positives for your environment, update `scripts/zap-rules.conf`:

```bash
# Example: Ignore CSP warnings in staging
10038	IGNORE	.*staging.*	.*	CSP not enforced in staging
```

## Testing Your Fixes

1. **Local Testing:**
   ```bash
   # Start your development server
   npm run dev
   
   # Test security headers
   curl -I http://localhost:3000
   ```

2. **Security Headers Analyzer:**
   Use online tools like:
   - https://securityheaders.com/
   - https://observatory.mozilla.org/

3. **Re-run DAST Scan:**
   ```bash
   cd scripts
   ZAP_SCAN_MODE=strict ./zap-script.sh
   ```

## Production Deployment Checklist

- [ ] All security headers implemented
- [ ] CSP policy tested and working
- [ ] Cookies have security flags
- [ ] HTTPS enforced
- [ ] ZAP scan passes with acceptable risk level
- [ ] Security headers verified with external tools

## Getting Help

If you encounter issues:

1. Check the detailed HTML report from ZAP
2. Review the specific rule documentation on OWASP ZAP website
3. Test fixes in staging before production
4. Update ZAP rules configuration for acceptable risks

Remember: Security is about balance. Some findings may be acceptable based on your application's requirements and environment.