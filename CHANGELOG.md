[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.3.1...HEAD)

## 🐛 Bug Fixes

- **build**: emit the missing webview declaration ([4c69500](https://github.com/stacksjs/very-happy-dom/commit/4c69500)) _(by glennmichael123 <gtorregosa@gmail.com>)_

## 🤖 Continuous Integration

- **release**: fetch the tag so its message is actually there ([2c56942](https://github.com/stacksjs/very-happy-dom/commit/2c56942)) _(by glennmichael123 <gtorregosa@gmail.com>)_

## Contributors

- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.3.0...HEAD)

## 🐛 Bug Fixes

- **dialog**: emit a declaration that parses ([55aa421](https://github.com/stacksjs/very-happy-dom/commit/55aa421)) _(by glennmichael123 <gtorregosa@gmail.com>)_

## 🤖 Continuous Integration

- **release**: pass the tag's notes to the GitHub Release ([3550904](https://github.com/stacksjs/very-happy-dom/commit/3550904)) _(by glennmichael123 <gtorregosa@gmail.com>)_

## Contributors

- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.2.0...HEAD)

## 🚀 Features

- **matchers**: add the aria, CSS and property matchers ([7e203bd](https://github.com/stacksjs/very-happy-dom/commit/7e203bd)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1618](https://github.com/stacksjs/very-happy-dom/issues/1618), [#1608](https://github.com/stacksjs/very-happy-dom/issues/1608), [#1602](https://github.com/stacksjs/very-happy-dom/issues/1602))
- **page**: add dialog events for alert, confirm and prompt ([5de9417](https://github.com/stacksjs/very-happy-dom/commit/5de9417)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1612](https://github.com/stacksjs/very-happy-dom/issues/1612), [#1602](https://github.com/stacksjs/very-happy-dom/issues/1602))
- **locator**: add filter({has}), or() and and() ([c10931d](https://github.com/stacksjs/very-happy-dom/commit/c10931d)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1619](https://github.com/stacksjs/very-happy-dom/issues/1619))
- **locator**: add boundingBox and scrollIntoViewIfNeeded ([9f9055b](https://github.com/stacksjs/very-happy-dom/commit/9f9055b)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1609](https://github.com/stacksjs/very-happy-dom/issues/1609), [#1600](https://github.com/stacksjs/very-happy-dom/issues/1600), [#1617](https://github.com/stacksjs/very-happy-dom/issues/1617))
- **page**: add setContent, and fix the document parse it exposed ([a5e2bd4](https://github.com/stacksjs/very-happy-dom/commit/a5e2bd4)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1610](https://github.com/stacksjs/very-happy-dom/issues/1610), [#1595](https://github.com/stacksjs/very-happy-dom/issues/1595))
- **locator**: add the form-control actions ([d1068b0](https://github.com/stacksjs/very-happy-dom/commit/d1068b0)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1608](https://github.com/stacksjs/very-happy-dom/issues/1608), [#1615](https://github.com/stacksjs/very-happy-dom/issues/1615), [#1616](https://github.com/stacksjs/very-happy-dom/issues/1616))
- **locator**: add evaluate, evaluateAll and the all*Text helpers ([3549710](https://github.com/stacksjs/very-happy-dom/commit/3549710)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1607](https://github.com/stacksjs/very-happy-dom/issues/1607))
- **page**: add the waitFor* family for page events ([4039cb7](https://github.com/stacksjs/very-happy-dom/commit/4039cb7)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1606](https://github.com/stacksjs/very-happy-dom/issues/1606))

## 🐛 Bug Fixes

- **dom**: collapse whitespace in innerText, and resolve its visibility ([6589fe0](https://github.com/stacksjs/very-happy-dom/commit/6589fe0)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1614](https://github.com/stacksjs/very-happy-dom/issues/1614), [#1600](https://github.com/stacksjs/very-happy-dom/issues/1600), [#1607](https://github.com/stacksjs/very-happy-dom/issues/1607))
- **css**: apply @media rules, and add emulateMedia ([f67bf7a](https://github.com/stacksjs/very-happy-dom/commit/f67bf7a)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1611](https://github.com/stacksjs/very-happy-dom/issues/1611), [#1600](https://github.com/stacksjs/very-happy-dom/issues/1600))
- **page**: make waitForSelector throw on timeout ([32c5f0e](https://github.com/stacksjs/very-happy-dom/commit/32c5f0e)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1605](https://github.com/stacksjs/very-happy-dom/issues/1605))
- **keyboard**: parse modifier combinations and populate code ([ada3489](https://github.com/stacksjs/very-happy-dom/commit/ada3489)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1615](https://github.com/stacksjs/very-happy-dom/issues/1615))
- **aria**: treat a declared zero size as hidden ([480899c](https://github.com/stacksjs/very-happy-dom/commit/480899c)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1617](https://github.com/stacksjs/very-happy-dom/issues/1617), [#1604](https://github.com/stacksjs/very-happy-dom/issues/1604), [#1601](https://github.com/stacksjs/very-happy-dom/issues/1601))
- **aria**: read checked state through aria-checked ([524698f](https://github.com/stacksjs/very-happy-dom/commit/524698f)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1616](https://github.com/stacksjs/very-happy-dom/issues/1616))
- **routing**: stop setRequestInterception(false) from killing routes ([7537569](https://github.com/stacksjs/very-happy-dom/commit/7537569)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1613](https://github.com/stacksjs/very-happy-dom/issues/1613))

## Contributors

- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.12...HEAD)

## 🚀 Features

- **matchers**: add web-first assertions through expect.extend ([1f34e25](https://github.com/stacksjs/very-happy-dom/commit/1f34e25)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1603](https://github.com/stacksjs/very-happy-dom/issues/1603))
- **locator**: auto-wait for actionability, and add locator.waitFor() ([ac1eba9](https://github.com/stacksjs/very-happy-dom/commit/ac1eba9)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1604](https://github.com/stacksjs/very-happy-dom/issues/1604), [#1605](https://github.com/stacksjs/very-happy-dom/issues/1605))

## Contributors

- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.11...HEAD)

## 🐛 Bug Fixes

- **browser**: make the console, response and error page events fire ([029bb19](https://github.com/stacksjs/very-happy-dom/commit/029bb19)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1602](https://github.com/stacksjs/very-happy-dom/issues/1602))
- **locator**: skip hidden elements in getBy* queries ([56dab61](https://github.com/stacksjs/very-happy-dom/commit/56dab61)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1601](https://github.com/stacksjs/very-happy-dom/issues/1601), [#1600](https://github.com/stacksjs/very-happy-dom/issues/1600))
- **dom**: resolve box metrics through the cascade ([4060bad](https://github.com/stacksjs/very-happy-dom/commit/4060bad)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1600](https://github.com/stacksjs/very-happy-dom/issues/1600))

## 🧪 Tests

- **package**: assert the packed tarball carries every export ([9cbcf24](https://github.com/stacksjs/very-happy-dom/commit/9cbcf24)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1598](https://github.com/stacksjs/very-happy-dom/issues/1598))

## 🧹 Chores

- run bun-git-hooks and @stacksjs/logsmith, not the unrelated npm 'git-hooks' and 'logsmith' ([4402f91](https://github.com/stacksjs/very-happy-dom/commit/4402f91)) _(by Chris <chrisbreuer93@gmail.com>)_
- release through @stacksjs/bumpx, not the unrelated npm 'bumpx' ([9a43a7d](https://github.com/stacksjs/very-happy-dom/commit/9a43a7d)) _(by Chris <chrisbreuer93@gmail.com>)_

## Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.10...HEAD)

## 🚀 Features

- **browser**: add the context emulation knobs ([41f04a3](https://github.com/stacksjs/very-happy-dom/commit/41f04a3)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1593](https://github.com/stacksjs/very-happy-dom/issues/1593), [#1593](https://github.com/stacksjs/very-happy-dom/issues/1593))
- **browser**: make goto perform a real navigation ([185dba7](https://github.com/stacksjs/very-happy-dom/commit/185dba7)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1586](https://github.com/stacksjs/very-happy-dom/issues/1586))
- **browser**: add locators with role and accessible-name queries ([a0b0889](https://github.com/stacksjs/very-happy-dom/commit/a0b0889)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1591](https://github.com/stacksjs/very-happy-dom/issues/1591), [#1592](https://github.com/stacksjs/very-happy-dom/issues/1592), [#1588](https://github.com/stacksjs/very-happy-dom/issues/1588))
- **network**: add page.route() and context.route() ([573adc6](https://github.com/stacksjs/very-happy-dom/commit/573adc6)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1594](https://github.com/stacksjs/very-happy-dom/issues/1594))
- **browser**: let BrowserContext own cookies and origin storage ([e6e05e4](https://github.com/stacksjs/very-happy-dom/commit/e6e05e4)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1593](https://github.com/stacksjs/very-happy-dom/issues/1593), [#1593](https://github.com/stacksjs/very-happy-dom/issues/1593), [#1594](https://github.com/stacksjs/very-happy-dom/issues/1594))
- **browser**: add state queries to BrowserPage ([49457fa](https://github.com/stacksjs/very-happy-dom/commit/49457fa)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1592](https://github.com/stacksjs/very-happy-dom/issues/1592))
- **css**: resolve stylesheet rules in getComputedStyle ([3af7403](https://github.com/stacksjs/very-happy-dom/commit/3af7403)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1597](https://github.com/stacksjs/very-happy-dom/issues/1597))

## 🐛 Bug Fixes

- **global-registrator**: install the virtual FormData constructor ([b947a78](https://github.com/stacksjs/very-happy-dom/commit/b947a78)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1599](https://github.com/stacksjs/very-happy-dom/issues/1599))
- **browser**: make page input interaction reach the DOM ([adea612](https://github.com/stacksjs/very-happy-dom/commit/adea612)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1588](https://github.com/stacksjs/very-happy-dom/issues/1588))
- **indexeddb**: roll back writes when a transaction aborts ([70580e7](https://github.com/stacksjs/very-happy-dom/commit/70580e7)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1585](https://github.com/stacksjs/very-happy-dom/issues/1585))
- **browser**: evaluate in the frame realm and forward its argument ([40162fb](https://github.com/stacksjs/very-happy-dom/commit/40162fb)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1587](https://github.com/stacksjs/very-happy-dom/issues/1587))
- **document**: resolve head and body from documentElement ([99cf5b2](https://github.com/stacksjs/very-happy-dom/commit/99cf5b2)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1595](https://github.com/stacksjs/very-happy-dom/issues/1595))
- **browser**: give BrowserFrame a real Window ([b570adc](https://github.com/stacksjs/very-happy-dom/commit/b570adc)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1590](https://github.com/stacksjs/very-happy-dom/issues/1590), [#1586](https://github.com/stacksjs/very-happy-dom/issues/1586), [#1587](https://github.com/stacksjs/very-happy-dom/issues/1587))
- **parser**: break the html-parser element-class import cycle ([f35ef09](https://github.com/stacksjs/very-happy-dom/commit/f35ef09)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **canvas**: make HTMLCanvasElement a real element ([0757ce9](https://github.com/stacksjs/very-happy-dom/commit/0757ce9)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1556](https://github.com/stacksjs/very-happy-dom/issues/1556), [#1556](https://github.com/stacksjs/very-happy-dom/issues/1556))
- **window**: apply the configured navigator userAgent ([aca5eb4](https://github.com/stacksjs/very-happy-dom/commit/aca5eb4)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **dom**: honour the force argument in classList.toggle ([83287bc](https://github.com/stacksjs/very-happy-dom/commit/83287bc)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **build**: emit the register and jsdom entry points ([d398c4b](https://github.com/stacksjs/very-happy-dom/commit/d398c4b)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **lint**: drop unused imports blocking CI ([96da06f](https://github.com/stacksjs/very-happy-dom/commit/96da06f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **docs**: use the config keys bunpress actually has ([95e2203](https://github.com/stacksjs/very-happy-dom/commit/95e2203)) _(by Chris <chrisbreuer93@gmail.com>)_

## 📚 Documentation

- replace boilerplate with real very-happy-dom documentation ([5fae54d](https://github.com/stacksjs/very-happy-dom/commit/5fae54d)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- link the community as stacksjs.com/discord ([4a220de](https://github.com/stacksjs/very-happy-dom/commit/4a220de)) _(by Chris <chrisbreuer93@gmail.com>)_

## 🧹 Chores

- **deps**: update all non-major dependencies ([d6d6d87](https://github.com/stacksjs/very-happy-dom/commit/d6d6d87)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: drop renovate config in favour of buddy-bot ([cb7fbfc](https://github.com/stacksjs/very-happy-dom/commit/cb7fbfc)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1459](https://github.com/stacksjs/very-happy-dom/issues/1459), [#1570](https://github.com/stacksjs/very-happy-dom/issues/1570), [#1571](https://github.com/stacksjs/very-happy-dom/issues/1571), [#1561](https://github.com/stacksjs/very-happy-dom/issues/1561))
- **deps**: dtsx 0.11.10 ([59d2e7c](https://github.com/stacksjs/very-happy-dom/commit/59d2e7c)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: dtsx 0.11.8, for declarations that parse ([5ecdd30](https://github.com/stacksjs/very-happy-dom/commit/5ecdd30)) _(by Chris <chrisbreuer93@gmail.com>)_

## Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.9...v0.1.10)

## 🚀 Features

- **dom**: activate anchor navigation ([4d67934](https://github.com/stacksjs/very-happy-dom/commit/4d67934)) _(by Chris <chrisbreuer93@gmail.com>)_
- **window**: emulate opened browsing contexts ([fc5b1fb](https://github.com/stacksjs/very-happy-dom/commit/fc5b1fb)) _(by Chris <chrisbreuer93@gmail.com>)_

## 🧹 Chores

- release v0.1.10 ([4425a50](https://github.com/stacksjs/very-happy-dom/commit/4425a50)) _(by Chris <chrisbreuer93@gmail.com>)_
- **actions**: update action releaser ([11a17f5](https://github.com/stacksjs/very-happy-dom/commit/11a17f5)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: refresh pantry lockfile ([eca2346](https://github.com/stacksjs/very-happy-dom/commit/eca2346)) _(by Chris <chrisbreuer93@gmail.com>)_
- **actions**: update action releaser ([4bc62e6](https://github.com/stacksjs/very-happy-dom/commit/4bc62e6)) _(by Chris <chrisbreuer93@gmail.com>)_

## Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.8...v0.1.9)

## 🐛 Bug Fixes

- **dom**: expose static Node constants ([dc96a41](https://github.com/stacksjs/very-happy-dom/commit/dc96a41)) _(by Chris <chrisbreuer93@gmail.com>)_

## 🧹 Chores

- release v0.1.9 ([fa986d5](https://github.com/stacksjs/very-happy-dom/commit/fa986d5)) _(by Chris <chrisbreuer93@gmail.com>)_

## Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.7...v0.1.8)

## 🐛 Bug Fixes

- **slots**: preserve APIs when cloning templates ([d0e5a38](https://github.com/stacksjs/very-happy-dom/commit/d0e5a38)) _(by Chris <chrisbreuer93@gmail.com>)_

## 🧹 Chores

- release v0.1.8 ([b35f9c6](https://github.com/stacksjs/very-happy-dom/commit/b35f9c6)) _(by Chris <chrisbreuer93@gmail.com>)_

## Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.6...v0.1.7)

## 🐛 Bug Fixes

- **custom-elements**: set document during construction ([469ccd3](https://github.com/stacksjs/very-happy-dom/commit/469ccd3)) _(by Chris <chrisbreuer93@gmail.com>)_

## 🧪 Tests

- **screenshot**: allow cold WebView startup ([49fdcbd](https://github.com/stacksjs/very-happy-dom/commit/49fdcbd)) _(by Chris <chrisbreuer93@gmail.com>)_

## 🧹 Chores

- release v0.1.7 ([3c6d0e8](https://github.com/stacksjs/very-happy-dom/commit/3c6d0e8)) _(by Chris <chrisbreuer93@gmail.com>)_
- **release**: add patch release command ([59693d5](https://github.com/stacksjs/very-happy-dom/commit/59693d5)) _(by Chris <chrisbreuer93@gmail.com>)_

## Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.5...v0.1.6)

## 🐛 Bug Fixes

- **websocket**: defer connection failure state ([e6af131](https://github.com/stacksjs/very-happy-dom/commit/e6af131)) _(by Chris <chrisbreuer93@gmail.com>)_

## 🧹 Chores

- release v0.1.6 ([4b3b9b2](https://github.com/stacksjs/very-happy-dom/commit/4b3b9b2)) _(by Chris <chrisbreuer93@gmail.com>)_

## Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.5...HEAD)

## 🐛 Bug Fixes

- **websocket**: defer connection failure state ([e6af131](https://github.com/stacksjs/very-happy-dom/commit/e6af131)) _(by Chris <chrisbreuer93@gmail.com>)_

## Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.4...v0.1.5)

## 🐛 Bug Fixes

- **web-components**: complete upgrade and slot semantics ([9d60632](https://github.com/stacksjs/very-happy-dom/commit/9d60632)) _(by Chris <chrisbreuer93@gmail.com>)_

## 🧹 Chores

- release v0.1.5 ([9f9fe7d](https://github.com/stacksjs/very-happy-dom/commit/9f9fe7d)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: declare bun ^1.3.14 in deps.yaml ([d0af529](https://github.com/stacksjs/very-happy-dom/commit/d0af529)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: refresh bun.lock to pick up pickier 0.1.37 ([e7bdd28](https://github.com/stacksjs/very-happy-dom/commit/e7bdd28)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: refresh bun.lock to pick up pickier 0.1.35 ([b49b7fb](https://github.com/stacksjs/very-happy-dom/commit/b49b7fb)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: refresh bun.lock to pick up pickier 0.1.33 ([a0855f4](https://github.com/stacksjs/very-happy-dom/commit/a0855f4)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: refresh bun.lock to pick up @stacksjs/logsmith 0.2.3 ([70b7241](https://github.com/stacksjs/very-happy-dom/commit/70b7241)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: refresh bun.lock to pick up buddy-bot 0.9.20 ([9a00efe](https://github.com/stacksjs/very-happy-dom/commit/9a00efe)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: bump better-dx to ^0.2.15 ([9d67b87](https://github.com/stacksjs/very-happy-dom/commit/9d67b87)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **docs**: fix pickier markdown errors ([f5c9108](https://github.com/stacksjs/very-happy-dom/commit/f5c9108)) _(by glennmichael123 <gtorregosa@gmail.com>)_

## Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.4...HEAD)

## 🐛 Bug Fixes

- **web-components**: complete upgrade and slot semantics ([9d60632](https://github.com/stacksjs/very-happy-dom/commit/9d60632)) _(by Chris <chrisbreuer93@gmail.com>)_

## 🧹 Chores

- **deps**: declare bun ^1.3.14 in deps.yaml ([d0af529](https://github.com/stacksjs/very-happy-dom/commit/d0af529)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: refresh bun.lock to pick up pickier 0.1.37 ([e7bdd28](https://github.com/stacksjs/very-happy-dom/commit/e7bdd28)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: refresh bun.lock to pick up pickier 0.1.35 ([b49b7fb](https://github.com/stacksjs/very-happy-dom/commit/b49b7fb)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: refresh bun.lock to pick up pickier 0.1.33 ([a0855f4](https://github.com/stacksjs/very-happy-dom/commit/a0855f4)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: refresh bun.lock to pick up @stacksjs/logsmith 0.2.3 ([70b7241](https://github.com/stacksjs/very-happy-dom/commit/70b7241)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: refresh bun.lock to pick up buddy-bot 0.9.20 ([9a00efe](https://github.com/stacksjs/very-happy-dom/commit/9a00efe)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: bump better-dx to ^0.2.15 ([9d67b87](https://github.com/stacksjs/very-happy-dom/commit/9d67b87)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **docs**: fix pickier markdown errors ([f5c9108](https://github.com/stacksjs/very-happy-dom/commit/f5c9108)) _(by glennmichael123 <gtorregosa@gmail.com>)_

## Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.3...v0.1.4)

### 🐛 Bug Fixes

- add setup-bun to publish-commit job ([0e0af08](https://github.com/stacksjs/very-happy-dom/commit/0e0af08)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- ship dist only, remove bun export condition pointing to unpublished src ([bc412ee](https://github.com/stacksjs/very-happy-dom/commit/bc412ee)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- include src/ in published files for bun export condition ([b0ba4fa](https://github.com/stacksjs/very-happy-dom/commit/b0ba4fa)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### 🤖 Continuous Integration

- drop redundant setup-bun (pantry installs bun via deps.yaml) ([88ed1d6](https://github.com/stacksjs/very-happy-dom/commit/88ed1d6)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### 🧹 Chores

- release v0.1.4 ([c3006e8](https://github.com/stacksjs/very-happy-dom/commit/c3006e8)) _(by Chris <chrisbreuer93@gmail.com>)_
- move dtsx deps to devDependencies and bump to ^0.9.17 ([719c347](https://github.com/stacksjs/very-happy-dom/commit/719c347)) _(by Chris <chrisbreuer93@gmail.com>)_
- refresh bun.lock to pick up latest pickier ([8e873c2](https://github.com/stacksjs/very-happy-dom/commit/8e873c2)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fresh install to pick up dtsx 0.9.14 and bunfig 0.15.9 ([85d5b2c](https://github.com/stacksjs/very-happy-dom/commit/85d5b2c)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- bump to 0.1.3 with src/ in published files ([7809b72](https://github.com/stacksjs/very-happy-dom/commit/7809b72)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- release v0.1.2 ([2e2a463](https://github.com/stacksjs/very-happy-dom/commit/2e2a463)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- revert release v0.1.2 ([782f6c0](https://github.com/stacksjs/very-happy-dom/commit/782f6c0)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.2...HEAD)

### 🐛 Bug Fixes

- add setup-bun to publish-commit job ([0e0af08](https://github.com/stacksjs/very-happy-dom/commit/0e0af08)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- ship dist only, remove bun export condition pointing to unpublished src ([bc412ee](https://github.com/stacksjs/very-happy-dom/commit/bc412ee)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- include src/ in published files for bun export condition ([b0ba4fa](https://github.com/stacksjs/very-happy-dom/commit/b0ba4fa)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### 🤖 Continuous Integration

- drop redundant setup-bun (pantry installs bun via deps.yaml) ([88ed1d6](https://github.com/stacksjs/very-happy-dom/commit/88ed1d6)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### 🧹 Chores

- move dtsx deps to devDependencies and bump to ^0.9.17 ([719c347](https://github.com/stacksjs/very-happy-dom/commit/719c347)) _(by Chris <chrisbreuer93@gmail.com>)_
- refresh bun.lock to pick up latest pickier ([8e873c2](https://github.com/stacksjs/very-happy-dom/commit/8e873c2)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fresh install to pick up dtsx 0.9.14 and bunfig 0.15.9 ([85d5b2c](https://github.com/stacksjs/very-happy-dom/commit/85d5b2c)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- bump to 0.1.3 with src/ in published files ([7809b72](https://github.com/stacksjs/very-happy-dom/commit/7809b72)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- release v0.1.2 ([2e2a463](https://github.com/stacksjs/very-happy-dom/commit/2e2a463)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- revert release v0.1.2 ([782f6c0](https://github.com/stacksjs/very-happy-dom/commit/782f6c0)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.1...v0.1.2)

### 🧹 Chores

- release v0.1.2 ([fa9df61](https://github.com/stacksjs/very-happy-dom/commit/fa9df61)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- revert release v0.1.2 ([782f6c0](https://github.com/stacksjs/very-happy-dom/commit/782f6c0)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- release v0.1.2 ([85e42ce](https://github.com/stacksjs/very-happy-dom/commit/85e42ce)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: bump bun.sh to ^1.3.13 and refresh pantry.lock ([26c13eb](https://github.com/stacksjs/very-happy-dom/commit/26c13eb)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.1...HEAD)

### 🧹 Chores

- revert release v0.1.2 ([782f6c0](https://github.com/stacksjs/very-happy-dom/commit/782f6c0)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- release v0.1.2 ([85e42ce](https://github.com/stacksjs/very-happy-dom/commit/85e42ce)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: bump bun.sh to ^1.3.13 and refresh pantry.lock ([26c13eb](https://github.com/stacksjs/very-happy-dom/commit/26c13eb)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.0...v0.1.1)

### 🧪 Tests

- **screenshot**: strengthen WebView probe with screenshot step ([2ef41cd](https://github.com/stacksjs/very-happy-dom/commit/2ef41cd)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🤖 Continuous Integration

- let pantry install bun in publish-commit ([6b99c15](https://github.com/stacksjs/very-happy-dom/commit/6b99c15)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🧹 Chores

- release v0.1.1 ([da5d441](https://github.com/stacksjs/very-happy-dom/commit/da5d441)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([938ecba](https://github.com/stacksjs/very-happy-dom/commit/938ecba)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([ea537ff](https://github.com/stacksjs/very-happy-dom/commit/ea537ff)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([b850548](https://github.com/stacksjs/very-happy-dom/commit/b850548)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([666897f](https://github.com/stacksjs/very-happy-dom/commit/666897f)) _(by Chris <chrisbreuer93@gmail.com>)_
- get CI to pass ([8ac369b](https://github.com/stacksjs/very-happy-dom/commit/8ac369b)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([ad180f4](https://github.com/stacksjs/very-happy-dom/commit/ad180f4)) _(by Chris <chrisbreuer93@gmail.com>)_
- minor stability improvements ([e3cb9a5](https://github.com/stacksjs/very-happy-dom/commit/e3cb9a5)) _(by Chris <chrisbreuer93@gmail.com>)_
- fresh install to pick up pickier 0.1.21 ([2a84b87](https://github.com/stacksjs/very-happy-dom/commit/2a84b87)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- gitignore pantry directory ([b7dda45](https://github.com/stacksjs/very-happy-dom/commit/b7dda45)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- update vscode config ([8689954](https://github.com/stacksjs/very-happy-dom/commit/8689954)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- repo cleanup and modernization ([c4a97b0](https://github.com/stacksjs/very-happy-dom/commit/c4a97b0)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/very-happy-dom/compare/v0.1.0...HEAD)

### 🧪 Tests

- **screenshot**: strengthen WebView probe with screenshot step ([2ef41cd](https://github.com/stacksjs/very-happy-dom/commit/2ef41cd)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🤖 Continuous Integration

- let pantry install bun in publish-commit ([6b99c15](https://github.com/stacksjs/very-happy-dom/commit/6b99c15)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🧹 Chores

- wip ([938ecba](https://github.com/stacksjs/very-happy-dom/commit/938ecba)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([ea537ff](https://github.com/stacksjs/very-happy-dom/commit/ea537ff)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([b850548](https://github.com/stacksjs/very-happy-dom/commit/b850548)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([666897f](https://github.com/stacksjs/very-happy-dom/commit/666897f)) _(by Chris <chrisbreuer93@gmail.com>)_
- get CI to pass ([8ac369b](https://github.com/stacksjs/very-happy-dom/commit/8ac369b)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([ad180f4](https://github.com/stacksjs/very-happy-dom/commit/ad180f4)) _(by Chris <chrisbreuer93@gmail.com>)_
- minor stability improvements ([e3cb9a5](https://github.com/stacksjs/very-happy-dom/commit/e3cb9a5)) _(by Chris <chrisbreuer93@gmail.com>)_
- fresh install to pick up pickier 0.1.21 ([2a84b87](https://github.com/stacksjs/very-happy-dom/commit/2a84b87)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- gitignore pantry directory ([b7dda45](https://github.com/stacksjs/very-happy-dom/commit/b7dda45)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- update vscode config ([8689954](https://github.com/stacksjs/very-happy-dom/commit/8689954)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- repo cleanup and modernization ([c4a97b0](https://github.com/stacksjs/very-happy-dom/commit/c4a97b0)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

### 🧹 Chores

- update lockfile ([20fd613](https://github.com/stacksjs/very-happy-dom/commit/20fd613)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([272c703](https://github.com/stacksjs/very-happy-dom/commit/272c703)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([a33e60b](https://github.com/stacksjs/very-happy-dom/commit/a33e60b)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([3b9170a](https://github.com/stacksjs/very-happy-dom/commit/3b9170a)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: update all non-major dependencies (#970) ([b18093e](https://github.com/stacksjs/very-happy-dom/commit/b18093e)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#970](https://github.com/stacksjs/very-happy-dom/issues/970), [#970](https://github.com/stacksjs/very-happy-dom/issues/970))
- wip ([a96612d](https://github.com/stacksjs/very-happy-dom/commit/a96612d)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([825ad6a](https://github.com/stacksjs/very-happy-dom/commit/825ad6a)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([1bca840](https://github.com/stacksjs/very-happy-dom/commit/1bca840)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([dfab3e1](https://github.com/stacksjs/very-happy-dom/commit/dfab3e1)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([0fc377f](https://github.com/stacksjs/very-happy-dom/commit/0fc377f)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([b21d859](https://github.com/stacksjs/very-happy-dom/commit/b21d859)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([8371b2a](https://github.com/stacksjs/very-happy-dom/commit/8371b2a)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([133d1ce](https://github.com/stacksjs/very-happy-dom/commit/133d1ce)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([53f5296](https://github.com/stacksjs/very-happy-dom/commit/53f5296)) _(by Chris <chrisbreuer93@gmail.com>)_
- readme updates ([34e416c](https://github.com/stacksjs/very-happy-dom/commit/34e416c)) _(by Chris <chrisbreuer93@gmail.com>)_
- housekeeping ([c870115](https://github.com/stacksjs/very-happy-dom/commit/c870115)) _(by Chris <chrisbreuer93@gmail.com>)_
- add pantry lockfile ([4304aac](https://github.com/stacksjs/very-happy-dom/commit/4304aac)) _(by Chris <chrisbreuer93@gmail.com>)_
- several minor improvements ([eaf5977](https://github.com/stacksjs/very-happy-dom/commit/eaf5977)) _(by Chris <chrisbreuer93@gmail.com>)_
- use Pantry action for publish-commit and add job dependencies ([bb2e2de](https://github.com/stacksjs/very-happy-dom/commit/bb2e2de)) _(by Chris <chrisbreuer93@gmail.com>)_
- update better-dx to ^0.2.7 ([df76592](https://github.com/stacksjs/very-happy-dom/commit/df76592)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- enrich CLAUDE.md with detailed project context from README ([239fc90](https://github.com/stacksjs/very-happy-dom/commit/239fc90)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- update CLAUDE.md with project context and crosswind details ([9fe8d4d](https://github.com/stacksjs/very-happy-dom/commit/9fe8d4d)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- add proper claude code guidelines ([9f06591](https://github.com/stacksjs/very-happy-dom/commit/9f06591)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([db5f0b7](https://github.com/stacksjs/very-happy-dom/commit/db5f0b7)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([dd3380e](https://github.com/stacksjs/very-happy-dom/commit/dd3380e)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([52c5062](https://github.com/stacksjs/very-happy-dom/commit/52c5062)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([a4cbe1a](https://github.com/stacksjs/very-happy-dom/commit/a4cbe1a)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([aca44ac](https://github.com/stacksjs/very-happy-dom/commit/aca44ac)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([9acb64b](https://github.com/stacksjs/very-happy-dom/commit/9acb64b)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([3248309](https://github.com/stacksjs/very-happy-dom/commit/3248309)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([5734e8a](https://github.com/stacksjs/very-happy-dom/commit/5734e8a)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([2a164f3](https://github.com/stacksjs/very-happy-dom/commit/2a164f3)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([e77ea3b](https://github.com/stacksjs/very-happy-dom/commit/e77ea3b)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([89d8074](https://github.com/stacksjs/very-happy-dom/commit/89d8074)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([3b54556](https://github.com/stacksjs/very-happy-dom/commit/3b54556)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([688eaf3](https://github.com/stacksjs/very-happy-dom/commit/688eaf3)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([0834e2e](https://github.com/stacksjs/very-happy-dom/commit/0834e2e)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([ea12191](https://github.com/stacksjs/very-happy-dom/commit/ea12191)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update dependency actions/cache to v5.0.3 (#539) ([99967c7](https://github.com/stacksjs/very-happy-dom/commit/99967c7)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#539](https://github.com/stacksjs/very-happy-dom/issues/539), [#539](https://github.com/stacksjs/very-happy-dom/issues/539))
- **deps**: update dependency actions/checkout to v6.0.2 (#540) ([7217b61](https://github.com/stacksjs/very-happy-dom/commit/7217b61)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#540](https://github.com/stacksjs/very-happy-dom/issues/540), [#540](https://github.com/stacksjs/very-happy-dom/issues/540))
- **deps**: update all non-major dependencies (#541) ([a7c7d82](https://github.com/stacksjs/very-happy-dom/commit/a7c7d82)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#541](https://github.com/stacksjs/very-happy-dom/issues/541), [#541](https://github.com/stacksjs/very-happy-dom/issues/541))
- wip ([5c94e25](https://github.com/stacksjs/very-happy-dom/commit/5c94e25)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([c9e0424](https://github.com/stacksjs/very-happy-dom/commit/c9e0424)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([99911f9](https://github.com/stacksjs/very-happy-dom/commit/99911f9)) _(by Chris <chrisbreuer93@gmail.com>)_
- initial commit ([1a785d8](https://github.com/stacksjs/very-happy-dom/commit/1a785d8)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _[renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot])_
- _glennmichael123 <gtorregosa@gmail.com>_

<!-- eslint-disable markdown/no-duplicate-heading -->

## v0.3.1...main

[compare changes](https://github.com/stacksjs/ts-starter/compare/v0.3.1...main)

### 🚀 Enhancements

- Add `bun-plugin-dts-auto` ([c0c487b](https://github.com/stacksjs/ts-starter/commit/c0c487b))

### ❤️ Contributors

- Chris <chrisbreuer93@gmail.com>

## v0.3.0...main

[compare changes](https://github.com/stacksjs/ts-starter/compare/v0.3.0...main)

### 🏡 Chore

- Fix isolatedDeclarations setting ([b87b6b1](https://github.com/stacksjs/ts-starter/commit/b87b6b1))
- Adjust urls ([0a40b72](https://github.com/stacksjs/ts-starter/commit/0a40b72))

### ❤️ Contributors

- Chris <chrisbreuer93@gmail.com>

## v0.2.1...main

[compare changes](https://github.com/stacksjs/ts-starter/compare/v0.2.1...main)

### 🚀 Enhancements

- Add `noFallthroughCasesInSwitch` ([b9cfa30](https://github.com/stacksjs/ts-starter/commit/b9cfa30))
- Add `verbatimModuleSyntax` ([c495d17](https://github.com/stacksjs/ts-starter/commit/c495d17))
- Several updates ([f703179](https://github.com/stacksjs/ts-starter/commit/f703179))

### 🩹 Fixes

- Properly use bun types ([7144221](https://github.com/stacksjs/ts-starter/commit/7144221))

### 🏡 Chore

- Adjust badge links ([432aff7](https://github.com/stacksjs/ts-starter/commit/432aff7))
- Add `runs-on` options ([9a5b97f](https://github.com/stacksjs/ts-starter/commit/9a5b97f))
- Cache node_modules ([ba2f6ce](https://github.com/stacksjs/ts-starter/commit/ba2f6ce))
- Use `ubuntu-latest` for now ([1add684](https://github.com/stacksjs/ts-starter/commit/1add684))
- Minor updates ([1007cff](https://github.com/stacksjs/ts-starter/commit/1007cff))
- Lint ([d531bdc](https://github.com/stacksjs/ts-starter/commit/d531bdc))
- Remove bunx usage ([e1a5575](https://github.com/stacksjs/ts-starter/commit/e1a5575))
- Pass bun flag ([960976f](https://github.com/stacksjs/ts-starter/commit/960976f))
- Use defaults ([157455b](https://github.com/stacksjs/ts-starter/commit/157455b))
- Run typecheck using bun flag ([f22f3b1](https://github.com/stacksjs/ts-starter/commit/f22f3b1))
- Test ([0b3c3a1](https://github.com/stacksjs/ts-starter/commit/0b3c3a1))
- Use modern js for commitlint ([4bd6978](https://github.com/stacksjs/ts-starter/commit/4bd6978))
- Update worklows readme ([f54aae9](https://github.com/stacksjs/ts-starter/commit/f54aae9))
- Adjust readme ([92d7ff1](https://github.com/stacksjs/ts-starter/commit/92d7ff1))
- More updates ([0225587](https://github.com/stacksjs/ts-starter/commit/0225587))
- Add .zed settings for biome ([1688024](https://github.com/stacksjs/ts-starter/commit/1688024))
- Extend via alias ([b108d30](https://github.com/stacksjs/ts-starter/commit/b108d30))
- Lint ([d961b2a](https://github.com/stacksjs/ts-starter/commit/d961b2a))
- Minor updates ([e66d44a](https://github.com/stacksjs/ts-starter/commit/e66d44a))

### ❤️ Contributors

- Chris <chrisbreuer93@gmail.com>

## v0.2.0...main

[compare changes](https://github.com/stacksjs/ts-starter/compare/v0.2.0...main)

### 🏡 Chore

- Remove unused action ([066f85a](https://github.com/stacksjs/ts-starter/commit/066f85a))
- Housekeeping ([fc4e24d](https://github.com/stacksjs/ts-starter/commit/fc4e24d))

### ❤️ Contributors

- Chris <chrisbreuer93@gmail.com>

## v0.1.1...main

[compare changes](https://github.com/stacksjs/ts-starter/compare/v0.1.1...main)

### 🏡 Chore

- Adjust eslint config name ([53c2aa6](https://github.com/stacksjs/ts-starter/commit/53c2aa6))
- Set type module ([22dde14](https://github.com/stacksjs/ts-starter/commit/22dde14))

### ❤️ Contributors

- Chris <chrisbreuer93@gmail.com>

## v0.1.0...main

[compare changes](https://github.com/stacksjs/ts-starter/compare/v0.1.0...main)

### 🏡 Chore

- Use correct cover image ([75bd3ae](https://github.com/stacksjs/ts-starter/commit/75bd3ae))

### ❤️ Contributors

- Chris <chrisbreuer93@gmail.com>

## v0.0.5...main

[compare changes](https://github.com/stacksjs/ts-starter/compare/v0.0.5...main)

### 🚀 Enhancements

- Add pkgx deps ([319c066](https://github.com/stacksjs/ts-starter/commit/319c066))
- Use flat eslint config ([cdb0093](https://github.com/stacksjs/ts-starter/commit/cdb0093))

### 🏡 Chore

- Fix badge ([bc3b000](https://github.com/stacksjs/ts-starter/commit/bc3b000))
- Minor updates ([78dc522](https://github.com/stacksjs/ts-starter/commit/78dc522))
- Housekeeping ([e1cba3b](https://github.com/stacksjs/ts-starter/commit/e1cba3b))
- Additional housekeeping ([f5dc625](https://github.com/stacksjs/ts-starter/commit/f5dc625))
- Add `.gitattributes` ([7080f8c](https://github.com/stacksjs/ts-starter/commit/7080f8c))
- Adjust deps ([cc71b42](https://github.com/stacksjs/ts-starter/commit/cc71b42))
- Adjust wording ([3bc54b3](https://github.com/stacksjs/ts-starter/commit/3bc54b3))
- Adjust readme cover ([e6acbb2](https://github.com/stacksjs/ts-starter/commit/e6acbb2))

### ❤️ Contributors

- Chris <chrisbreuer93@gmail.com>

## v0.0.5...main

[compare changes](https://github.com/stacksjs/ts-starter/compare/v0.0.5...main)

### 🚀 Enhancements

- Add pkgx deps ([319c066](https://github.com/stacksjs/ts-starter/commit/319c066))
- Use flat eslint config ([cdb0093](https://github.com/stacksjs/ts-starter/commit/cdb0093))

### 🏡 Chore

- Fix badge ([bc3b000](https://github.com/stacksjs/ts-starter/commit/bc3b000))
- Minor updates ([78dc522](https://github.com/stacksjs/ts-starter/commit/78dc522))
- Housekeeping ([e1cba3b](https://github.com/stacksjs/ts-starter/commit/e1cba3b))
- Additional housekeeping ([f5dc625](https://github.com/stacksjs/ts-starter/commit/f5dc625))
- Add `.gitattributes` ([7080f8c](https://github.com/stacksjs/ts-starter/commit/7080f8c))
- Adjust deps ([cc71b42](https://github.com/stacksjs/ts-starter/commit/cc71b42))
- Adjust wording ([3bc54b3](https://github.com/stacksjs/ts-starter/commit/3bc54b3))
- Adjust readme cover ([e6acbb2](https://github.com/stacksjs/ts-starter/commit/e6acbb2))

### ❤️ Contributors

- Chris <chrisbreuer93@gmail.com>
