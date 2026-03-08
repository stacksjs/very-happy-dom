# VeryHappyDOM Test Suite

## 📊 Overview

**Total: 610+ Tests** organized in a single, well-structured directory.

## 📁 Directory Structure

```text
test/
├── Core Domain Tests (296 tests)
│   ├── storage.test.ts         # 50 - localStorage, sessionStorage
│   ├── timers.test.ts          # 29 - setTimeout, setInterval, rAF
│   ├── network.test.ts         # 43 - fetch, XHR, WebSocket
│   ├── observers.test.ts       # 45 - Mutation, Intersection, Resize
│   ├── xpath.test.ts           # 23 - XPath expressions
│   ├── events.test.ts          # 19 - CustomEvent, listeners
│   ├── interaction.test.ts     # 11 - Click, type, keyboard
│   ├── webcomponents.test.ts   # 21 - Shadow DOM, Custom Elements
│   ├── browser-apis.test.ts    # 31 - Performance, Clipboard, etc.
│   └── integration.test.ts     # 24 - End-to-end scenarios
│
├── Quality Assurance
│   └── error-handling.test.ts  # Error scenarios
│
├── Stress Tests (87 tests)
│   └── browser-api.stress.test.ts
│
├── Utilities
│   └── test-utils.ts           # Shared test helpers
│
└── Legacy (287+ tests)
    └── legacy/
        ├── advanced-features.test.ts
        ├── all-new-features.test.ts
        ├── dom-edge-cases.test.ts
        ├── dom.test.ts
        ├── final-features.test.ts
        ├── new-features.test.ts
        └── pseudo-class-selectors.test.ts
```

Performance benchmarks now live in `benchmark/index.ts` and are run with `bun run bench`.

## 🚀 Running Tests

### Run All Tests

```bash
bun test test/*.test.ts
```

### Run Specific Domain

```bash
# Storage & Timers
bun test test/storage.test.ts test/timers.test.ts

# Network & APIs
bun test test/network.test.ts test/browser-apis.test.ts

# Advanced Features
bun test test/observers.test.ts test/xpath.test.ts test/webcomponents.test.ts

# Quality Assurance
bun test test/error-handling.test.ts

# Benchmarks
bun run bench

# Integration
bun test test/integration.test.ts
```

### Run Legacy Tests

```bash
bun test test/legacy/*.test.ts
```

### Run Stress Tests

```bash
bun test test/browser-api.stress.test.ts
```

## 📋 Test Categories

### Domain Tests (296 tests)

Organized by functionality:

- **Storage** - localStorage, sessionStorage, isolation
- **Timers** - setTimeout, setInterval, requestAnimationFrame
- **Network** - fetch, XMLHttpRequest, WebSocket, interception
- **Observers** - MutationObserver, IntersectionObserver, ResizeObserver
- **XPath** - document.evaluate, expressions, result types
- **Events** - CustomEvent, addEventListener, page events
- **Interaction** - User interactions (click, type, keyboard, mouse)
- **Web Components** - Shadow DOM, Custom Elements
- **Browser APIs** - Performance, Clipboard, Geolocation, File API
- **Integration** - End-to-end scenarios

### Quality Assurance

- **Error Handling** - Invalid inputs, null refs, edge cases
- **Benchmarks** - `mitata` suites under `benchmark/`

### Stress Tests (87 tests)

- **Browser API Stress** - High-load scenarios

### Legacy Tests (287+ tests)

Preserved for backward compatibility in `test/legacy/`

## 🛠️ Test Utilities

Use `test-utils.ts` for consistent testing:

```typescript
import {
  cleanupWindow,
  createAssert,
  createTestWindow,
  TestStats
} from './test-utils'

const stats = new TestStats()
const assert = createAssert(stats)

const window = createTestWindow()
// ... test code ...
await cleanupWindow(window)

stats.printSummary()
stats.exit()
```

## 📖 Documentation

- **TESTING.md** - Comprehensive testing guide
- **TEST*SUMMARY.md** - Detailed coverage report
- **FEATURE*ROADMAP.md** - Feature status

## ✨ Key Features

✅ **Domain-Driven Organization** - Tests grouped by functionality
✅ **610+ Comprehensive Tests** - Extensive coverage
✅ **Performance Validated** - All operations < 1ms
✅ **Error Scenarios Covered** - Edge cases tested
✅ **Reusable Utilities** - Shared helpers
✅ **Clean Structure** - Single directory, clear organization
✅ **100% Pass Rate** - All tests passing

## 🎯 Test Quality

- **Isolation** - Each test creates own environment
- **Cleanup** - Proper resource management
- **Descriptive** - Clear test and assertion names
- **Comprehensive** - Happy path + edge cases + errors
- **Maintainable** - Shared utilities reduce duplication

---

*For detailed testing guidelines, see [TESTING.md](../TESTING.md)*
