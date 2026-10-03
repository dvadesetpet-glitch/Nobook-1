# Nobook Test Strategy

**Objective**: Achieve 70%+ code coverage on critical paths (ViewModel, Utils, Data layers)

---

## Test Structure

### Unit Tests (`src/test/java/`)
Core business logic, ViewModels, utilities. **No Android framework needed.**

```
src/test/java/com/ycngmn/nobook/
├── ui/viewmodel/
│   ├── MainViewModelTest.kt       ✓ Created
│   ├── SettingsViewModelTest.kt   ✓ Created
│   └── [TODO] OtherViewModels
├── utils/
│   ├── UtilsTest.kt              ✓ Created
│   ├── AdFilterTest.kt           [TODO] Regex + DOM patterns
│   └── [TODO] ScriptProcessing
└── data/
    └── [TODO] Repository tests
```

### Instrumented Tests (`src/androidTest/java/`)
UI components, WebView interactions. **Requires device/emulator.**

```
src/androidTest/java/com/ycngmn/nobook/
├── ui/
│   ├── screens/
│   │   └── NobookWVTest.kt       ✓ Created
│   └── components/
│       └── [TODO] Dialog tests
└── integration/
    └── [TODO] WebView + JavaScript
```

### Integration Tests (`src/test/java/`)
Full feature flows using Playwright (already present).

```
src/test/java/com/ycngmn/nobook/
└── AdblockTest.kt               ✓ Existing Playwright tests
```

---

## Running Tests

### Unit Tests (local, no device needed)
```bash
# All unit tests
./gradlew test

# Specific test class
./gradlew test --tests "MainViewModelTest"

# With coverage
./gradlew test jacocoTestReport
coverage: build/reports/jacoco/test/html/index.html
```

### Instrumented Tests (requires device/emulator)
```bash
# All instrumented tests
./gradlew connectedAndroidTest

# Specific test
./gradlew connectedAndroidTest --tests "NobookWVTest"

# With coverage
./gradlew connectedAndroidTest jacocoTestReport
coverage: build/reports/jacoco/androidTest/html/index.html
```

### All Tests
```bash
./gradlew testDebug connectedAndroidTest
```

### Playwright Tests (browser automation)
```bash
# Requires valid Facebook credentials in test env vars
./gradlew test --tests "AdblockTest"
```

---

## Test Coverage Targets

| Component | Target | Priority | Status |
|-----------|--------|----------|--------|
| MainViewModel | 90% | High | 🟡 Partial |
| SettingsViewModel | 85% | High | 🟡 Partial |
| Utils (ad filters, URL parsing) | 80% | High | 🔴 TODO |
| UI Components | 60% | Medium | 🔴 TODO |
| Data Layer | 75% | Medium | 🔴 TODO |
| **Overall** | **70%** | - | 🟡 20% (est) |

---

## Critical Paths to Test (Phase 1)

### 1. ViewModel Script Loading
Test: MainViewModelTest
- Scripts load on init ✓
- Theme color changes ✓
- Refresh reloads scripts ✓
- [TODO] Error handling on missing files

### 2. Settings Persistence
Test: SettingsViewModelTest
- All toggles work independently ✓
- Default values correct ✓
- [TODO] DataStore integration
- [TODO] Settings survive app restart

### 3. Ad Filter Regex (CRITICAL for #189)
Test: [TODO] AdFilterTest
- Sponsored text detection (50+ languages)
- Regex performance < 5ms per text
- No false positives
- No missed ads

### 4. WebView Lifecycle
Test: NobookWVTest
- WebView initializes ✓
- URL loads ✓
- [TODO] Back handler works
- [TODO] Cleanup on destroy (memory leak fix)

### 5. JavaScript Bridge
Test: [TODO] JavaScriptBridgeTest
- Download requests received
- Clipboard operations work
- Settings changes trigger reload
- Theme updates apply

---

## Test Examples

### Example: MainViewModelTest
```kotlin
@Test
fun testScriptsLoadedAfterInit() {
    viewModel = MainViewModel(mockResources, mockSettingsViewModel)
    
    assertNotNull("Scripts should be loaded", viewModel.scripts.value)
}
```

### Example: SettingsViewModelTest
```kotlin
@Test
fun testDesktopLayoutToggle() {
    val initialValue = viewModel.desktopLayout.value
    
    viewModel.setDesktopLayout(!initialValue)
    
    assertTrue("Desktop layout should be toggled", viewModel.desktopLayout.value != initialValue)
}
```

### Example: Ad Filter Test (TODO)
```kotlin
@Test
fun testSponsoredAdDetection() {
    val sponsoredTexts = listOf("Sponsored", "Ad", "Publicidad")
    val specialChar = '󰞋'
    
    sponsoredTexts.forEach { text ->
        val testText = "$text $specialChar"
        assertTrue("Should detect: $text", sponsoredRegex.test(testText))
    }
}
```

---

## Mock Strategy

### Using Mockk
```kotlin
// Mock Resources
val mockResources = mockk<Resources>()
every { mockResources.openRawResource(any()) } returns mockk(relaxed = true)

// Mock Context
val mockContext = mockk<Context>(relaxed = true)

// Partial mocks
val viewModel = mockk<MainViewModel>(relaxed = true)
every { viewModel.scripts } returns MutableState(testScripts)
```

---

## Continuous Integration (Phase 1.D)

GitHub Actions workflow (`.github/workflows/ci.yml`):
```yaml
- Run unit tests: ./gradlew test
- Run instrumented tests: ./gradlew connectedAndroidTest
- Upload coverage: Codecov
- Fail if coverage < 70%
```

---

## Test Execution Checklist (Phase 1)

- [ ] Dependencies added (Mockk, coroutines-test) ✓
- [ ] Unit test scaffolding created ✓
- [ ] Instrumented test scaffolding created ✓
- [ ] MainViewModelTest runs locally ✓
- [ ] SettingsViewModelTest runs locally ✓
- [ ] UtilsTest runs locally ✓
- [ ] NobookWVTest runs on device ✓
- [ ] Coverage baseline (< 30%)
- [ ] CI/CD test step added
- [ ] Coverage reports generated

---

## Next Tests to Add (Phase 1.A Continued)

1. **AdFilterTest.kt** - Critical for fixing #189 (ads still showing)
   - Test regex patterns
   - Test DOM mutation detection
   - Test performance (< 5ms per match)

2. **NetworkErrorDialogTest.kt** - UI component test
   - Dialog displays correctly
   - Dismiss callback fires

3. **DownloadBridgeTest.kt** - JavaScript bridge test
   - Download requests handled
   - File saved to correct location

4. **ThemeChangeTest.kt** - Theme injection test
   - Theme color updates apply
   - SystemBars colors update

---

## Running Baseline Coverage

```bash
# Generate coverage report
./gradlew test jacocoTestReport

# View report
open build/reports/jacoco/test/html/index.html

# Expected Phase 1 baseline: ~20-30% coverage
# Target Phase 1.A end: ~50% coverage
```

---

## Debugging Tests

### Fails Locally?
```bash
# Run with verbose output
./gradlew test --info

# Run single test
./gradlew test --tests "MainViewModelTest::testThemeColorInitialization"
```

### Fails on CI?
Check:
1. Java version (need Java 11+)
2. Gradle cache
3. Dependencies downloaded
4. Emulator API level (> 23)

---

## Best Practices

✓ **DO:**
- One assertion per test (or logically grouped)
- Descriptive test names (testX should describe what and why)
- Use `@Before` for setup
- Mock external dependencies
- Test edge cases

✗ **DON'T:**
- Test framework code (compose, lifecycle already tested)
- Use real network calls
- Sleep in tests
- Test multiple features in one test

---

## Success Metrics

By end of Phase 1.A:
- ✓ 70%+ critical path coverage
- ✓ All unit tests pass locally
- ✓ All instrumented tests pass on emulator
- ✓ Coverage reports integrated in CI
- ✓ Tests run in < 2 minutes locally

---

## Files Created

```
✓ gradle/libs.versions.toml           (added Mockk, coroutines-test)
✓ app/build.gradle.kts                (added test dependencies)
✓ app/src/test/java/.../MainViewModelTest.kt
✓ app/src/test/java/.../SettingsViewModelTest.kt
✓ app/src/test/java/.../UtilsTest.kt
✓ app/src/androidTest/java/.../NobookWVTest.kt
✓ TEST_STRATEGY.md                    (this file)
```

---

## Next: Phase 1.C - Dependency Updates

After tests pass, update outdated dependencies:
- Kotlin 2.3.10 → latest
- Compose Bom 2026.03.00 → latest
- Android Gradle Plugin 9.1.0 → latest
- All other libs to latest stable
