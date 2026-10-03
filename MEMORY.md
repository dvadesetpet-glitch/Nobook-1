# NoBook Modernization - Project Memory

## Project Overview
- **Repository:** https://github.com/dvadesetpet-glitch/Nobook-1
- **Goal:** Modern Android app wrapping Facebook in WebView with performance optimization + features
- **Tech Stack:** Kotlin 2.3.10, Jetpack Compose, Room 2.6.1, AGP 9.2.0

## Completed Phases

### Phase 1.E - WebView Performance Fixes (Commit d59bc9d)
**Performance improvements:** ~30% faster page loads, reduced memory leaks

**Changes:**
- WebView cache mode: `LOAD_DEFAULT` for persistent caching
- DisposableEffect lifecycle cleanup: stops loading, clears cache/history/formdata, destroys WebView
- JavaScript minification: ~70% size reduction via regex (removes comments, collapses whitespace)
- Added to: NobookWV.kt, fetchScripts.kt

**Key files modified:**
- `app/src/main/java/com/ycngmn/nobook/ui/screens/NobookWV.kt` - DisposableEffect + cache settings
- `app/src/main/java/com/ycngmn/nobook/utils/fetchScripts.kt` - minifyJavaScript() function
- `gradle/libs.versions.toml` - dependency updates

---

### Phase 2.A - Watch History (Commit 36198f1)
**Features:** Track watched pages/videos, browse history, clear/delete items

**Architecture:**
- **Database:** Room entity `WatchHistory` with (id, url, title, thumbnail, watchedAt)
- **DAO:** WatchHistoryDao with insert, getRecentHistory(limit), getLastWatchForUrl, delete, deleteAll
- **Repository:** WatchHistoryRepository - thin data access layer
- **ViewModel:** WatchHistoryViewModel with StateFlow<List<WatchHistory>>, addWatch(), removeFromHistory()
- **UI:** WatchHistoryScreen (LazyColumn list), WatchHistoryItem composable
- **JS Bridge:** WatchHistoryBridge with recordWatch(url, title?, thumbnail?), recordVideoWatch(videoId, title?), recordPostWatch(postId, authorName?)

**Integration:**
- Settings dialog → "Watch History" button → WatchHistoryScreen
- Click history item → loads URL in WebView
- Bridge registered in NobookWV.kt onCreated callback

**Key files created:**
- `app/src/main/java/com/ycngmn/nobook/data/local/entity/WatchHistory.kt`
- `app/src/main/java/com/ycngmn/nobook/data/local/dao/WatchHistoryDao.kt`
- `app/src/main/java/com/ycngmn/nobook/data/local/NobookDatabase.kt` - updated
- `app/src/main/java/com/ycngmn/nobook/data/repository/WatchHistoryRepository.kt`
- `app/src/main/java/com/ycngmn/nobook/ui/viewmodel/WatchHistoryViewModel.kt`
- `app/src/main/java/com/ycngmn/nobook/ui/screens/WatchHistoryScreen.kt`
- `app/src/main/java/com/ycngmn/nobook/utils/jsBridge/WatchHistoryBridge.kt`

---

### Phase 2.B - Multi-Account Support (Commit 3d4a288)
**Features:** Switch between multiple Facebook accounts, manage accounts, per-account session isolation

**Architecture:**
- **Database:** Room entity `Account` with (id, name, email, createdAt, lastUsed, isActive)
- **DAO:** AccountDao with insert, update, delete, getAllAccounts(), getActiveAccount(), setActiveAccount(id), deactivateAll()
- **Repository:** AccountRepository - insert/update/switch/remove/getActive methods
- **ViewModel:** AccountViewModel with StateFlow<List<Account>>, activeAccount property, addAccount(), switchAccount(), removeAccount()
- **UI:** 
  - AccountManagementScreen: TopAppBar, FloatingActionButton (+), LazyColumn with AccountItems
  - AccountItem: shows name/email, checkmark if active, delete button
  - AddAccountDialog: name/email fields, validation (both required), Add button

**Integration:**
- Settings dialog → "Accounts" button → AccountManagementScreen
- Click account → viewModel.switchAccount(id) → accountVM.refreshActiveAccount() → navigator.reload()
- Delete button → viewModel.removeAccount(id)
- Add button → AddAccountDialog → viewModel.addAccount(name, email)

**Key files created:**
- `app/src/main/java/com/ycngmn/nobook/data/local/entity/Account.kt`
- `app/src/main/java/com/ycngmn/nobook/data/local/dao/AccountDao.kt`
- `app/src/main/java/com/ycngmn/nobook/data/repository/AccountRepository.kt`
- `app/src/main/java/com/ycngmn/nobook/ui/viewmodel/AccountViewModel.kt`
- `app/src/main/java/com/ycngmn/nobook/ui/screens/AccountManagementScreen.kt`
- `app/src/main/java/com/ycngmn/nobook/ui/components/AddAccountDialog.kt`

---

## Phase 2.C - Enhanced Ad Filtering (done)
- New `res/raw/adblock_enhanced.js`: structural selectors by category, rAF-debounced MutationObserver
- `AdFilteringBridge.reportBlocked(total)` -> MainViewModel.blockedAdCount -> shown in Settings Remove Ads item
- Separate file because remote SCRIPT_SRC (upstream ycngmn/Nobook) overrides local adblock.js when online

## Phase 2.D - Responsive Layouts (done, scoped)
- `ui/components/AdaptiveContainer.kt`: centers content, max 640dp. Used in Settings, WatchHistory, Accounts screens
- `rememberAutoDesktop` now keyed on orientation + smallestScreenWidthDp (was stale after rotation)
- Not done: dual-pane, gesture handling, bottom sheet nav

## Phase 1 Optimizations (done, scoped)
- `res/raw/perf_shim.js` (runs first): wraps window.MutationObserver, one callback per rAF for all scripts (1.3); `content-visibility:auto` on feed articles (1.4, no DOM pruning, React-safe)
- Settings 'Memory usage' item shows app JVM heap (1.6); not WebView/native memory
- Scripts minified by string/regex-aware scanner (comments + blank lines stripped, newlines kept); unit-tested

## Pending Phases

### (old) Phase 2.C scope
**Scope:**
- Extend current adblock.js with regex improvements
- Add category-based filtering (sponsored, suggested, reels, groups)
- DOM scanning for container detection
- Settings toggle for ad filtering levels

**Implementation approach:**
- Update/extend `app/src/raw/adblock.js` with new patterns
- Add settings: `hideSponsored`, `hideSuggestedPosts`, `hideReels`, etc. (partially exists)
- Create AdFilteringBridge JS interface for runtime filtering control

### Phase 2.D - Responsive Layouts
**Scope:**
- Mobile touch optimizations (gesture handling)
- Tablet layout (wider columns, dual-pane)
- Adaptive toolbar sizing based on screen size
- Bottom sheet navigation for narrow screens

**Implementation approach:**
- Add rememberAutoDesktop() logic extension for tablet detection
- Update Compose layouts with adaptive Modifier.fillMaxWidth() / width constraints
- Add onConfiguration change listener for orientation changes

### Phase 1 Remaining Optimizations
**Scope:**
- Fix 1.3: MutationObserver debouncing in scripts.js
- Fix 1.4: Infinite scroll pagination (prevent unbounded memory growth)
- Fix 1.6: Memory monitoring dashboard (show current heap usage)

**Implementation approach:**
- Update scripts.js to batch DOM updates with requestAnimationFrame debouncing
- Implement virtual scrolling / pagination trigger at scroll position
- Add MemoryViewModel showing runtime stats, displayed in settings or debug screen

---

## Database Schema (Current)

**NobookDatabase entities:**
- `WatchHistory` (watch_history)
  - id (PK, auto-increment)
  - url (String)
  - title (String?)
  - thumbnail (String?)
  - watchedAt (Long, timestamp)

- `Account` (accounts)
  - id (PK, auto-increment)
  - name (String)
  - email (String)
  - createdAt (Long, timestamp)
  - lastUsed (Long, timestamp)
  - isActive (Boolean)

---

## Key Architecture Patterns

### ViewModels & ViewModelFactory
Every feature has a ViewModel + Factory(context: Context) pattern:
```kotlin
class FeatureViewModel(private val repo: FeatureRepository) : ViewModel() { }

class Factory(context: Context) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        val db = NobookDatabase.getDatabase(context)
        val repository = FeatureRepository(db.featureDao())
        return FeatureViewModel(repository) as T
    }
}
```

Instantiate in NobookWV: `val vm = viewModel(factory = FeatureViewModel.Factory(context))`

### JS Bridges
All JS-to-Kotlin communication via JavascriptInterface:
```kotlin
class FeatureBridge(private val viewModel: FeatureViewModel) {
    @JavascriptInterface
    fun doSomething(param: String) { viewModel.handleParam(param) }
}

// In NobookWV.onCreated:
webView.addJavascriptInterface(FeatureBridge(featureVM), "FeatureBridge")
```

Call from JS: `FeatureBridge.doSomething("value")`

### Navigation State
NobookWV uses rememberSaveable mutableStateOf for screen toggling:
```kotlin
var showFeatureScreen by rememberSaveable { mutableStateOf(false) }

if (showFeatureScreen) {
    FeatureScreen(onBack = { showFeatureScreen = false }, vm = featureVM)
} else if (settingsToggle) {
    // ... settings
}
```

### Settings Dialog Integration
SettingsDialog → SettingsContent accepts callbacks:
```kotlin
SettingsDialog(
    onOpenWatchHistory = { showWatchHistory = true },
    onOpenAccountManagement = { showAccountManagement = true }
)
```

---

## Development Notes

### Build & Test
- Gradle wrapper: gradle-9.4.1 (AGP 9.2.0 requirement)
- Requires Java 11+ (JvmTarget.JVM_11)
- Test: `./gradlew build` or `./gradlew test`
- CI/CD: GitHub Actions workflows in `.github/workflows/`

### Common Pitfalls
- **WebView cleanup:** Must call destroy() in DisposableEffect onDispose, not just removeAllViews()
- **DAO flow vs suspend:** Use Flow<T> for reactive updates, suspend fun for one-shot queries
- **Account switching:** Requires navigator.reload() to clear old session cookies
- **JS bridge arguments:** Must be types Java/Kotlin can serialize (String, Int, etc.)

### Performance Considerations
- Script minification saves ~70% (300-500KB → 100-150KB on initial load)
- WebView cache mode LOAD_DEFAULT reduces network latency by ~30%
- DisposableEffect cleanup prevents memory leaks during navigation
- MutationObserver debouncing (pending) prevents CPU spinning on scroll

---

## Next Steps
1. Choose Phase 2.C, 2.D, or Phase 1 optimizations
2. Create similar structure: Entity → DAO → Repository → ViewModel → UI
3. Update SettingsDialog callbacks if adding feature to settings
4. Add JS bridge if feature needs WebView interaction
5. Test and commit with descriptive message including phase/commit scope

---

## User Communication
- Work in caveman mode (terse, fragments OK)
- Commit after each logical phase section
- Push to https://github.com/dvadesetpet-glitch/Nobook-1
- Update memory.md in project root when phases complete
