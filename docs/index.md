---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "very-happy-dom"
  text: "A very happy DOM for Bun."
  tagline: "Blazingly fast, lightweight virtual DOM — a drop-in replacement for happy-dom and jsdom."
  image: /images/logo-white.png
  actions:
    - theme: brand
      text: Get Started
      link: /intro
    - theme: alt
      text: Drop-in Compatibility
      link: /drop-in-compat
    - theme: alt
      text: View on GitHub
      link: https://github.com/stacksjs/very-happy-dom

features:
  - title: "Blazingly Fast"
    icon: "⚡"
    details: "Window creation in ~4 µs and querySelector by ID in ~81 ns — most operations land in microseconds."
  - title: "Drop-in Replacement"
    icon: "🔄"
    details: "Swap one import for happy-dom or jsdom. GlobalRegistrator, JSDOM, VirtualConsole and CookieJar all match."
  - title: "Comprehensive DOM"
    icon: "🌳"
    details: "Full manipulation, CSS selectors, XPath, and events with bubbling and capturing."
  - title: "Browser APIs"
    icon: "🧩"
    details: "Fetch, WebSocket, Storage, Canvas 2D, Observers, IndexedDB, Web Components and request interception."
---
