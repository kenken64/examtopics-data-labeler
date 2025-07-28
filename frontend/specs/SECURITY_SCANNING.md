# Security Scanning Configuration

This document describes the SAST (Static Application Security Testing) setup for the AWS Certification Web Application project.

## Overview

We use multiple security scanning tools to perform comprehensive automated security analysis across three sub-projects:
- **Frontend (Next.js)**: OWASP Dependency-Check for Node.js dependencies
- **Telegram Bot (Node.js)**: OWASP Dependency-Check for Node.js dependencies  
- **Backend (Python Flask)**: Bandit, Safety, Semgrep, pip-audit, and PyLint for Python code and dependencies

## Workflows

### 1. Frontend SAST Scan (`.github/workflows/frontend-sast.yml`)
- **Triggers**: Push to main branches, PRs, weekly schedule (Mondays 2 AM UTC)
- **Scope**: Scans Next.js dependencies in `frontend/` directory
- **Threshold**: Fails on CVSS 4.0+ (Medium severity and above)

### 2. Telegram Bot SAST Scan (`.github/workflows/telegram-bot-sast.yml`)
- **Triggers**: Push to main branches, PRs, weekly schedule (Mondays 2 AM UTC)
- **Scope**: Scans Node.js dependencies in `telegram-bot/` directory
- **Threshold**: Fails on CVSS 4.0+ (Medium severity and above)

### 3. Backend Python SAST Scan (`.github/workflows/backend-sast.yml`)
- **Triggers**: Push to main branches, PRs, weekly schedule (Mondays 3 AM UTC)
- **Scope**: Comprehensive Python security analysis in `backend/` directory
- **Tools Used**:
  - **Bandit**: Python code security linter (AST-based analysis)
  - **Safety**: Known vulnerability database for Python packages
  - **pip-audit**: Alternative Python dependency vulnerability scanner
  - **Semgrep**: Static analysis with security-focused rules
  - **PyLint**: Security-focused code quality checks
- **Threshold**: Reports critical issues but doesn't fail build (configurable)

## Configuration

### Failure Thresholds

#### Node.js Projects (Frontend/Telegram Bot)
- **CVSS 4.0+**: Medium, High, and Critical severity vulnerabilities will fail the build
- **CVSS 0.0-3.9**: Low severity vulnerabilities are reported but don't fail the build

#### Python Backend
- **Bandit High Severity**: Critical code security issues (configurable to fail build)
- **Safety/pip-audit**: Known vulnerability alerts (warning mode, configurable to fail)
- **Semgrep Errors**: Static analysis errors flagged for review
- **Current Mode**: Warning-only (can be changed to fail on critical issues)

### Scan Settings
- **Node.js Audit**: Enabled for both projects
- **Dev Dependencies**: Included in scan (configurable per project needs)
- **Experimental Features**: Enabled for better detection
- **Bundle Audit**: Enabled for comprehensive coverage

### Reports Generated
1. **HTML Report**: Human-readable detailed report with vulnerability descriptions
2. **JSON Report**: Machine-readable format for automation
3. **XML Report**: Alternative structured format
4. **SARIF Report**: Security Alert Result Interchange Format for GitHub Security tab

## Viewing Results

### 1. GitHub Actions Artifacts
- Download detailed reports from the workflow run artifacts
- Reports are retained for 30 days

### 2. GitHub Security Tab
- SARIF files are automatically uploaded to GitHub's Security tab
- Navigate to: Repository → Security → Code scanning alerts

### 3. Workflow Summary
- Each run provides a summary in the GitHub Actions interface
- Includes scan details and next steps

## Managing False Positives

### Node.js Dependencies
Use the `.github/dependencycheck-suppressions.xml` file to suppress known false positives:

### Python Security Tools
Python tools use different configuration approaches:

#### Bandit Configuration
Configure in `backend/pyproject.toml` or `.bandit` files:
```toml
[tool.bandit]
exclude_dirs = ["tests", "venv"]
skips = ["B101"]  # Skip specific test IDs
```

#### Safety Suppressions
Use `backend/pyproject.toml`:
```toml
[tool.safety]
ignore = ["12345"]  # Ignore specific vulnerability IDs
```

#### Semgrep Rules
Configure via CLI or `.semgrepignore` file:
```bash
# Skip specific rules
semgrep --config=auto --exclude-rule="python.lang.security.audit.dangerous-system-call"
```

### OWASP Dependency-Check
Use the `.github/dependencycheck-suppressions.xml` file to suppress known false positives:

```xml
<suppress until="2024-12-31Z">
    <notes>Reason for suppression and review date</notes>
    <packageUrl regex="true">^pkg:npm/package-name@.*$</packageUrl>
    <cve>CVE-YYYY-XXXX</cve>
</suppress>
```

### Best Practices for Suppressions
1. Always include a clear reason in `<notes>`
2. Set an expiration date with `until` attribute
3. Be specific with package URLs and CVE numbers
4. Regular review suppressed vulnerabilities

## Remediation Workflow

When vulnerabilities are found:

1. **Review the Report**: Check the HTML report in artifacts for details
2. **Assess Impact**: Determine if the vulnerability affects your application
3. **Update Dependencies**: Use `npm audit fix` or manual updates
4. **Verify Fix**: Re-run the scan to confirm resolution
5. **Document**: If suppression is needed, document the reason

## Common Commands

### Manual Dependency Updates

#### Node.js Projects
```bash
# Frontend
cd frontend
npm audit
npm audit fix
npm update

# Telegram Bot
cd telegram-bot
npm audit
npm audit fix
npm update
```

#### Python Backend
```bash
# Backend
cd backend

# Check for vulnerabilities
safety check
pip-audit

# Update dependencies (manual review recommended)
pip list --outdated
pip install --upgrade package_name

# Fix specific vulnerabilities
pip-audit --fix  # Auto-fix when possible
safety check --json | jq '.[]' # Review details

# Run security scans locally
bandit -r . -c pyproject.toml
semgrep --config=auto .
pylint --load-plugins=pylint.extensions.bad_builtin *.py
```

### Local Dependency-Check Run
```bash
# Install dependency-check locally (optional)
wget https://github.com/jeremylong/DependencyCheck/releases/download/v8.4.3/dependency-check-8.4.3-release.zip
unzip dependency-check-8.4.3-release.zip

# Run scan locally
./dependency-check/bin/dependency-check.sh --project "local-scan" --scan ./frontend --format HTML
```

## Schedule

- **Automatic Scans**: Every Monday at 2:00 AM UTC
- **Manual Scans**: Triggered on push/PR to main branches
- **Review Cycle**: Monthly review of suppressions and thresholds

## Integration

These workflows integrate with:
- **GitHub Security Advisories**: Automatic vulnerability database updates
- **npm audit**: Native Node.js security auditing
- **GitHub Dependabot**: Automated dependency updates (if enabled)

## Support

For questions about security scanning:
1. Check the [OWASP Dependency-Check documentation](https://jeremylong.github.io/DependencyCheck/)
2. Review GitHub's [Code Scanning documentation](https://docs.github.com/en/code-security/code-scanning)
3. Consult the project maintainers for suppression requests