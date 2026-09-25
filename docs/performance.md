# Performance

Most operations complete in microseconds. The numbers below come from the
project's own benchmark suite, run on an Apple M3 Pro with Bun 1.3.11.

## vs happy-dom vs jsdom

| Operation | very-happy-dom | happy-dom | jsdom | Faster&nbsp;by |
|---|---|---|---|---|
| Window&nbsp;Creation | **4.08&nbsp;µs** | 92.83&nbsp;µs | 1.22&nbsp;ms | 22.7x |
| createElement | **463.02&nbsp;ns** | 2.62&nbsp;µs | 4.67&nbsp;µs | 5.7x |
| createElement&nbsp;+&nbsp;setAttribute | **748.35&nbsp;ns** | 15.41&nbsp;µs | 6.62&nbsp;µs | 8.8x |
| innerHTML&nbsp;(medium) | **41.61&nbsp;µs** | 47.48&nbsp;µs | 168.98&nbsp;µs | 1.1x |
| innerHTML&nbsp;(large,&nbsp;200&nbsp;nodes) | **1.92&nbsp;ms** | 3.72&nbsp;ms | 6.27&nbsp;ms | 1.9x |
| querySelector&nbsp;by&nbsp;ID | **81.03&nbsp;ns** | n/a | 2.76&nbsp;µs | 34.1x |
| querySelector&nbsp;by&nbsp;class | **242.20&nbsp;ns** | n/a | 3.52&nbsp;µs | 14.5x |
| querySelectorAll&nbsp;(200&nbsp;matches) | **66.44&nbsp;µs** | n/a | 66.55&nbsp;µs | ~1x |
| querySelectorAll&nbsp;+&nbsp;iteration | **76.44&nbsp;µs** | n/a | 170.37&nbsp;µs | 2.2x |
| appendChild&nbsp;(single) | **1.70&nbsp;µs** | 4.58&nbsp;µs | 6.14&nbsp;µs | 2.7x |
| appendChild&nbsp;(1000&nbsp;children) | **852.90&nbsp;µs** | 1.54&nbsp;ms | 4.45&nbsp;ms | 1.8x |
| setAttribute | **124.66&nbsp;ns** | 2.64&nbsp;µs | 1.43&nbsp;µs | 11.5x |
| getAttribute | **2.18&nbsp;ns** | 28.85&nbsp;ns | 194.98&nbsp;ns | 13.2x |
| classList.add | **3.97&nbsp;µs** | 6.88&nbsp;µs | 4.87&nbsp;µs | 1.2x |
| addEventListener&nbsp;+&nbsp;dispatch | **2.67&nbsp;µs** | 5.43&nbsp;µs | 3.65&nbsp;µs | 1.4x |
| textContent&nbsp;set | **470.48&nbsp;ns** | 1.72&nbsp;µs | 4.67&nbsp;µs | 3.7x |
| cloneNode&nbsp;(deep) | **6.16&nbsp;µs** | 21.59&nbsp;µs | 15.55&nbsp;µs | 2.5x |
| style.setProperty | **490.62&nbsp;ns** | 4.20&nbsp;µs | 4.64&nbsp;µs | 8.6x |
| Build&nbsp;data&nbsp;table&nbsp;(50x5) | **519.30&nbsp;µs** | 754.42&nbsp;µs | 2.89&nbsp;ms | 1.5x |
| Update&nbsp;list&nbsp;items&nbsp;(100) | **454.98&nbsp;µs** | n/a | 2.41&nbsp;ms | 5.3x |

> **Note:** "Faster by" compares very-happy-dom to the next-fastest result.
> `n/a` marks cases the harness does not measure for that library.

## Where the wins come from

The largest gaps are in the operations test suites repeat most:

- **Window creation** — 22.7x faster than happy-dom and ~300x faster than
  jsdom. A suite that builds a fresh environment per test pays this on every
  single test, so it usually dominates.
- **Attribute access** — `getAttribute` is effectively free, and `setAttribute`
  is an order of magnitude cheaper than either alternative.
- **ID and class lookups** — the selector engine fast-paths simple selectors
  instead of parsing and walking generically.

Bulk HTML parsing is closer: `innerHTML` with a medium payload is only about
1.1x faster than happy-dom. If your tests are dominated by parsing large HTML
strings, expect a smaller improvement than the headline numbers suggest.

## Running the benchmarks

```bash
bun run bench
```

Machine-readable and quiet variants are available:

```bash
bun run bench:json
bun run bench:quiet
```

Benchmarks use [mitata](https://github.com/evanwashere/mitata). Absolute numbers
will differ on your hardware — the ratios are the interesting part.

## Benchmarking your own suite

The clearest signal is your real test suite. Measure it before and after
switching:

```bash
time bun test
```

If you create a `Window` per test, also consider whether you need one at all —
reusing a single registered global window across a file is faster still, at the
cost of isolation between tests.
