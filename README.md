# TW-Scroll-Layout

**English** · [Français](README.fr.md)

![Status](https://img.shields.io/badge/status-stable-green)
![TiddlyWiki](https://img.shields.io/badge/TiddlyWiki-%E2%89%A55.3.0-blue)

A TiddlyWiki layout plugin that gives the story river, sidebar tabs, and tab content their own independent scroll areas. The page no longer scrolls as a whole — each zone scrolls in place.

## Overview

By default, TiddlyWiki scrolls the entire browser window. This plugin replaces that behaviour with isolated scroll areas:

- **Story river** — scrolls independently inside its column
- **Sidebar tab content** — scrolls independently inside the tab panel
- **Sidebar tab bar** — stays fixed; only the content below it scrolls

Everything else (topbar, sidebar header, layout chrome) remains fixed on screen.

The plugin activates only when its layout is selected (`$:/layout` = `$:/plugins/nikorion/scroll-layout/layout`). All other layouts fall back to exact core behaviour — no side effects when the layout is inactive.

## Features

**Independent scroll areas**

The story river becomes a `$scrollable` widget (`fallthrough="no"`), which intercepts all scroll events and scrolls the river column instead of the window. The sidebar uses a full flex chain so height propagates from `.tc-sidebar-scrollable` down to the tab content panel, which is the only scrolling node.

**Sticky tiddler titles**

When the `stickytitles` option is enabled in the Vanilla theme, tiddler titles stick to the top of the story river as you scroll. The plugin gates this behaviour on the same theme option, so disabling sticky titles in theme settings also disables it here.

When a sticky title detaches from its frame (the frame has scrolled above the river's top edge), the class `tc-tiddler-stuck` is added to the title element. This triggers a visual treatment: negative side margins extend the bar edge-to-edge, and a drop shadow signals the detached state.

**Sidebar layout support**

Both Vanilla sidebar layouts are handled:

| Layout | Behaviour |
|---|---|
| `fixed-fluid` | River width = `storyright − storyleft`; sidebar aligned to its boundary |
| `fluid-fixed` | River is `width:auto` with `margin-right: sidebarwidth + 6px`; sidebar gets a left padding |

When the sidebar is hidden, the river expands to fill the available width automatically.

**Scroll-into-view patch**

The classic storyview calls `$tw.pageScroller.scrollIntoView()`, which scrolls the browser window. When the river is a `$scrollable` widget, `overflow:hidden` on `body` prevents window scrolling — newly opened tiddlers would not scroll into view.

The startup module patches `$tw.pageScroller.scrollIntoView`: when the target element is inside `.tc-story-river`, the patch uses the browser-native `element.scrollIntoView()` instead, which scrolls the nearest scrollable ancestor (the `$scrollable` widget's inner div). A `requestAnimationFrame` defers the check so newly inserted DOM nodes have time to connect before `closest()` runs.

## Installation

**Live demo**: [https://nikorion.github.io/TW-Scroll-Layout/](https://nikorion.github.io/TW-Scroll-Layout/) — try the plugin before installing it.

**From the nikorion plugin library** (TiddlyWiki then offers each new version as an update):

1. On [nikorion.github.io/tw-plugins](https://nikorion.github.io/tw-plugins/), drag the **nikorion plugin library** button onto your wiki (once per wiki).
2. Open *Control Panel → Plugins → Get more plugins → Open plugin library*, choose the nikorion tab and install **Scroll Layout**.

**By hand**: download [`TW-Scroll-Layout-Plugin.json`](https://nikorion.github.io/TW-Scroll-Layout/TW-Scroll-Layout-Plugin.json) and drag it onto your wiki.

Requires TiddlyWiki ≥ 5.3.0.

Then open the layout picker (gear icon → Layout) and select **Scroll Layout**.

## Development

Clone [tw-dev](https://github.com/nikorion/tw-dev) next to this repository: `pnpm dev` runs it, and it links by itself the nikorion plugins the dev wiki loads — from clones sitting next to this one (`../TW-Math`…), so your edits to them are live, otherwise from a read-only copy it fetches from GitHub. No symlink, no `TIDDLYWIKI_PLUGIN_PATH`, no admin rights. `pnpm build` alone still needs `TIDDLYWIKI_PLUGIN_PATH`: point it to `../tw-dev/.state/TW-Scroll-Layout/plugins`, created by `pnpm dev`.

```
pnpm install
pnpm dev      # dev wiki + hot reload; the URL (random free port) is printed on start
pnpm build    # dist/TW-Scroll-Layout-Plugin.json + docs/ (demo wiki, published by CI)
```

Sources are in `src/scroll-layout/`. The dev wiki is in `wiki/`. `pnpm dev` runs the shared dev server `../tw-dev` (cloned next to this repository), which pairs nodemon (reboots TW only on JS module / `plugin.info` changes) with an SSE content-HMR server: content tiddlers (`.tid`, `.multids`, `.css`…) are hot-swapped in the browser with state preserved, while module changes trigger a reboot then a full reload once TW is back up.

## Files

| File | Role |
|---|---|
| `src/scroll-layout/plugin.info` | Plugin metadata |
| `src/scroll-layout/layout.tid` | Layout entry point (tag `$:/tags/Layout`) — transclude core page template |
| `src/scroll-layout/story.tid` | Shadow override of `$:/core/ui/PageTemplate/story` — wraps story river in `$scrollable` |
| `src/scroll-layout/stylesheet.tid` | All CSS — gated on the layout being active |
| `src/scroll-layout/modules/startup.js` | `$tw.pageScroller` patch + `tc-tiddler-stuck` scroll listener |

## Compatibility

- TiddlyWiki ≥ 5.3.0
- Vanilla theme (the CSS targets Vanilla's metric tiddlers and class names)
- No external dependencies

## Version history

**v1.0.0**

Initial release. Isolated scroll areas for story river and sidebar tab content. Sticky titles with `tc-tiddler-stuck` detached-frame state. `$tw.pageScroller` patch for scroll-into-view in `$scrollable` containers. Full support for fixed-fluid and fluid-fixed sidebar layouts with sidebar-hidden fallback.

## License

MIT License — see `LICENSE`
