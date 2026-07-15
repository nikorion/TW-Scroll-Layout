# TW-Scroll-Layout

![Status](https://img.shields.io/badge/status-stable-green)
![TiddlyWiki](https://img.shields.io/badge/TiddlyWiki-%E2%89%A55.3.0-blue)

A TiddlyWiki layout plugin that gives the story river, sidebar tabs, and tab content their own independent scroll areas. The page no longer scrolls as a whole — each zone scrolls in place.

---

## Overview

By default, TiddlyWiki scrolls the entire browser window. This plugin replaces that behaviour with isolated scroll areas:

- **Story river** — scrolls independently inside its column
- **Sidebar tab content** — scrolls independently inside the tab panel
- **Sidebar tab bar** — stays fixed; only the content below it scrolls

Everything else (topbar, sidebar header, layout chrome) remains fixed on screen.

The plugin activates only when its layout is selected (`$:/layout` = `$:/plugins/nikorion/scroll-layout/layout`). All other layouts fall back to exact core behaviour — no side effects when the layout is inactive.

---

## Features

### Independent scroll areas

The story river becomes a `$scrollable` widget (`fallthrough="no"`), which intercepts all scroll events and scrolls the river column instead of the window. The sidebar uses a full flex chain so height propagates from `.tc-sidebar-scrollable` down to the tab content panel, which is the only scrolling node.

### Sticky tiddler titles

When the `stickytitles` option is enabled in the Vanilla theme, tiddler titles stick to the top of the story river as you scroll. The plugin gates this behaviour on the same theme option, so disabling sticky titles in theme settings also disables it here.

When a sticky title detaches from its frame (the frame has scrolled above the river's top edge), the class `tc-tiddler-stuck` is added to the title element. This triggers a visual treatment: negative side margins extend the bar edge-to-edge, and a drop shadow signals the detached state.

### Sidebar layout support

Both Vanilla sidebar layouts are handled:

| Layout | Behaviour |
|---|---|
| `fixed-fluid` | River width = `storyright − storyleft`; sidebar aligned to its boundary |
| `fluid-fixed` | River is `width:auto` with `margin-right: sidebarwidth + 6px`; sidebar gets a left padding |

When the sidebar is hidden, the river expands to fill the available width automatically.

### Scroll-into-view patch

The classic storyview calls `$tw.pageScroller.scrollIntoView()`, which scrolls the browser window. When the river is a `$scrollable` widget, `overflow:hidden` on `body` prevents window scrolling — newly opened tiddlers would not scroll into view.

The startup module patches `$tw.pageScroller.scrollIntoView`: when the target element is inside `.tc-story-river`, the patch uses the browser-native `element.scrollIntoView()` instead, which scrolls the nearest scrollable ancestor (the `$scrollable` widget's inner div). A `requestAnimationFrame` defers the check so newly inserted DOM nodes have time to connect before `closest()` runs.

---

## Installation

1. Download `TW-Scroll-Layout-Plugin.json` from the [latest release](https://github.com/nikorion/TW-Scroll-Layout/releases/latest)
2. Drag and drop it into your TiddlyWiki (≥ 5.3.0)
3. Save and reload
4. Open the layout picker (gear icon → Layout) and select **Scroll Layout**

---

## Development

```
pnpm install
pnpm dev      # TW dev server on :8080 (default; free port if busy) with content HMR over SSE
pnpm build    # generates dist/TW-Scroll-Layout-Plugin.json + docs/TW-Scroll-Layout-Wiki.html
```

Sources are in `src/scroll-layout/`. The dev wiki is in `wiki/`. `pnpm dev` runs an orchestrator (`scripts/dev.cjs`) that pairs nodemon (reboots TW only on JS module / `plugin.info` changes) with an SSE content-HMR server (`scripts/dev-hmr.cjs`): content tiddlers (`.tid`/`.multids`) are hot-swapped in the browser with state preserved, while module changes trigger a reboot then a full reload once TW is back up.

---

## Files

| File | Role |
|---|---|
| `src/scroll-layout/plugin.info` | Plugin metadata |
| `src/scroll-layout/layout.tid` | Layout entry point (tag `$:/tags/Layout`) — transclude core page template |
| `src/scroll-layout/story.tid` | Shadow override of `$:/core/ui/PageTemplate/story` — wraps story river in `$scrollable` |
| `src/scroll-layout/stylesheet.tid` | All CSS — gated on the layout being active |
| `src/scroll-layout/modules/startup.js` | `$tw.pageScroller` patch + `tc-tiddler-stuck` scroll listener |

---

## Compatibility

- TiddlyWiki ≥ 5.3.0
- Vanilla theme (the CSS targets Vanilla's metric tiddlers and class names)
- No external dependencies

---

## Version history

### v1.0.0

Initial release. Isolated scroll areas for story river and sidebar tab content. Sticky titles with `tc-tiddler-stuck` detached-frame state. `$tw.pageScroller` patch for scroll-into-view in `$scrollable` containers. Full support for fixed-fluid and fluid-fixed sidebar layouts with sidebar-hidden fallback.

---

## License

MIT License — see `LICENSE`
