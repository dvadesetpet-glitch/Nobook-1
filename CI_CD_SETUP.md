# Nobook CI/CD Setup

**GitHub Actions Workflows** for automated building, testing, and release.

---

## Workflows

### 1. CI Pipeline (ci.yml)

**Trigger**: Push to main/develop, or PR to main/develop

**Jobs**:
- **test**: Run unit tests
  - Set up JDK 17
  - Cache Gradle dependencies
  - Run `./gradlew test`
  - Upload test reports on failure
  
- **lint**: Run static analysis
  - Run `./gradlew lint`
  - Upload lint report
  
- **build**: Build debug APK
  - Assemble debug build
  - Upload APK artifact

**Status**: ✓ Tests must pass before merge
**Duration**: ~5-10 minutes

---

### 2. Release Pipeline (release.yml)

**Trigger**: Push tag matching `v*` (e.g., `v2.0.0`)

**Jobs**:
- **build**: Create release
  - Build release APK
  - Extract version from tag
  - Create GitHub Release
  - Upload APK to release

**Manual Steps** (before pushing tag):
```bash
git tag v2.0.0
git push origin v2.0.0
```

---

## Setup Instructions

### 1. Enable Actions
- Go: GitHub repo → Settings → Actions → Allow all actions

### 2. Set Secrets (optional, for future)
- Settings → Secrets and variables → Actions
- Add if needed: SIGNING_KEY, SIGNING_KEY_STORE_PASSWORD

### 3. Branch Protection (recommended)
- Settings → Branches → main branch
- ✓ Require status checks to pass before merging
- ✓ Require CI workflow to pass

---

## Running Workflows Locally

Test locally before pushing:

```bash
# Unit tests
./gradlew test

# Lint
./gradlew lint

# Build debug
./gradlew assembleDebug

# Build release (requires signing config)
./gradlew assembleRelease
```

---

## Workflow Status

View in GitHub:
- Actions tab → CI or Release workflow
- See logs, artifacts, test reports

---

## Future Enhancements

Phase 2:
- [ ] Code coverage reporting (Codecov integration)
- [ ] Automated version bumping
- [ ] Signed APK distribution
- [ ] Google Play Store deployment
- [ ] Performance regression detection
- [ ] Security scanning (SAST)

---

## Troubleshooting

### Tests fail in CI but pass locally
- Check Java version: `java -version`
- Ensure gradle cache is working
- Run with `--info` flag for details

### APK upload fails in release
- Check signing configuration
- Verify release build type is configured

### Workflow not triggered
- Verify branch name matches (main/develop)
- Check file changes trigger (push vs PR)
- View Actions tab for logs

---

## Files Created

```
.github/
├── workflows/
│   ├── ci.yml           ✓ Main CI pipeline
│   └── release.yml      ✓ Release automation
└── CI_CD_SETUP.md       ✓ This file
```

---

**Phase 1.D Complete** ✓

CI/CD ready. Next: Phase 1.E - WebView Performance Fixes (implement audit recommendations)
