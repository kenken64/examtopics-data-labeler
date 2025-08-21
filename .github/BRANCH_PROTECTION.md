# Branch Protection Strategy

This document outlines the branch protection and CI/CD strategy for the ExamTopics Data Labeler project.

## Branch Structure

### Development Branch: `q-labeler`
- **Purpose**: Active development and testing
- **CI/CD**: All workflows run on push
- **Quality Gates**: Must pass all checks before merging to master

### Production Branch: `master` 
- **Purpose**: Production-ready code only
- **CI/CD**: Only deployment workflows run on push
- **Protection**: Only accepts validated merges from q-labeler

## Workflow Strategy

### 1. Development Workflows (Run on `q-labeler` push)
- ✅ Backend Python Tests
- ✅ Frontend DAST Security Scan  
- ✅ SAST Security Scans (Backend, Frontend, Telegram Bot)
- ✅ Linting (Backend, Frontend, Telegram Bot)
- ✅ Docker Build & Publish

### 2. PR Validation (Run on PRs to `master`)
- ✅ Q-Labeler Status Check
- ✅ All development workflows must pass
- ✅ Automated status reporting

### 3. Production Deployment (Run on `master` push)
- ✅ Pre-deployment validation
- ✅ Frontend production build
- ✅ Backend production build  
- ✅ Telegram bot deployment
- ✅ Deployment tagging

## GitHub Branch Protection Rules

To implement this strategy, configure these branch protection rules in GitHub:

### Master Branch Protection

1. **Go to Repository Settings → Branches**
2. **Add rule for `master` branch:**

```yaml
Branch Protection Rule: master
├── Require status checks to pass before merging: ✅
│   ├── Require branches to be up to date: ✅
│   └── Required status checks:
│       ├── "PR Validation - Check Q-Labeler Status / Validate Q-Labeler Branch Status"
│       ├── "PR Validation - Check Q-Labeler Status / summary"
│       └── Any other critical checks
├── Require pull request reviews before merging: ✅
│   ├── Required approving reviews: 1
│   └── Dismiss stale reviews: ✅
├── Require conversation resolution before merging: ✅
├── Require signed commits: ⚠️ (Optional)
├── Require linear history: ⚠️ (Optional)
├── Do not allow bypassing the above settings: ✅
└── Restrict pushes that create files: ❌
```

## Development Workflow

### For Developers:

1. **Work on q-labeler branch:**
   ```bash
   git checkout q-labeler
   git pull origin q-labeler
   # Make changes
   git add .
   git commit -m "Your changes"
   git push origin q-labeler
   ```

2. **All CI/CD checks run automatically**
   - Wait for all checks to pass
   - Fix any failing tests or security issues

3. **Create PR to master when ready:**
   ```bash
   # Via GitHub UI or CLI
   gh pr create --base master --head q-labeler --title "Release: Your Feature"
   ```

4. **PR Validation runs:**
   - Checks q-labeler branch status
   - Ensures all workflows passed
   - Blocks merge if any issues found

5. **Merge to master (if approved):**
   - Automatic deployment to production
   - Creates deployment tag
   - Deployment status reporting

### For Maintainers:

1. **Review PR requirements:**
   - All q-labeler workflows passing ✅
   - Code review approved ✅  
   - No merge conflicts ✅

2. **Merge options:**
   - Use "Squash and merge" for clean history
   - Use "Merge commit" to preserve branch history

3. **Monitor deployment:**
   - Check master deployment workflow
   - Verify production deployment success

## Quality Gates

### Before Merge to Master:
- ✅ All tests passing on q-labeler
- ✅ Security scans clean
- ✅ Linting issues resolved
- ✅ Docker builds successful
- ✅ Code review approved

### Master Branch Deployment:
- ✅ Only validated PR merges deploy
- ✅ Full production build process
- ✅ Deployment status tracking
- ✅ Automatic rollback on failure (future enhancement)

## Emergency Procedures

### Hotfix Process:
1. Create hotfix branch from master
2. Apply minimal fix
3. Fast-track through q-labeler if needed
4. Emergency merge with admin override

### Manual Deployment:
```bash
# Trigger manual deployment
gh workflow run "Master Branch Deployment"
```

## Monitoring and Alerts

### Key Metrics:
- ✅ Q-labeler build success rate
- ✅ PR merge time  
- ✅ Deployment success rate
- ✅ Security issue detection

### Notifications:
- Failed builds on q-labeler
- Security vulnerabilities detected
- Deployment failures
- PR review requests

## Benefits

1. **Quality Assurance**: No untested code reaches production
2. **Security**: Continuous security scanning and validation
3. **Efficiency**: Automated validation reduces manual oversight
4. **Visibility**: Clear status reporting and deployment tracking
5. **Reliability**: Only validated, tested code gets deployed

## Configuration Commands

```bash
# Set up branch protection via GitHub CLI
gh api repos/:owner/:repo/branches/master/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"checks":[{"context":"PR Validation - Check Q-Labeler Status / Validate Q-Labeler Branch Status"}]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null
```

---

This strategy ensures that your master branch always contains production-ready, fully tested code while maintaining an efficient development workflow on q-labeler.