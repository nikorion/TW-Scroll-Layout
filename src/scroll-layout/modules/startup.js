/*\
title: $:/plugins/nikorion/scroll-layout/startup.js
type: application/javascript
module-type: startup
\*/
(function(){
"use strict";

exports.name = "scroll-layout";
exports.platforms = ["browser"];
exports.after = ["startup"];
exports.synchronous = true;

/*
 * Measure the real layout width of the river's scrollbar (offsetWidth minus clientWidth minus
 * borders) and publish it as --sl-scrollbar-real-width on the root element. The stylesheet
 * subtracts it from the configured right-hand gaps so the story content keeps the same width
 * whatever scrollbar the browser actually draws (thin/auto/none, per engine and platform);
 * overlay scrollbars measure 0 and leave the gaps untouched. Re-measured via the ResizeObserver
 * in prepareRiver, which fires when a width-mode config change reflows the river's content box.
 */
function updateScrollbarWidthVar(scroller) {
	var cs = getComputedStyle(scroller),
		borders = (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0),
		width = Math.max(0, scroller.offsetWidth - scroller.clientWidth - borders);
	document.documentElement.style.setProperty("--sl-scrollbar-real-width", width + "px");
}

/*
 * Vertical offset of an element from the top of the scroller's content, in scroll coordinates.
 */
function docTop(scroller, element) {
	return element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
}

/*
 * Ensure there is enough empty space below the story for the LAST tiddler to reach the top of
 * the viewport (minus its scroll-margin-top). Without this, a short tiddler at the end of the
 * story physically cannot be scrolled into the "flush top + gap" landing position — the river
 * simply runs out of content below it (typical victims: system/config tiddlers, which tend to
 * be short). The filler is sized exactly, so the river cannot be overscrolled past that point.
 */
function updateOverscroll(scroller) {
	var frontdrop = scroller.querySelector(".story-frontdrop");
	if(!frontdrop || !frontdrop.parentNode) {
		return;
	}
	// Last story tiddler frame = last .tc-tiddler-frame sibling before the frontdrop
	var lastFrame = null,
		node = frontdrop.parentNode.firstElementChild;
	while(node) {
		if(node.classList.contains("tc-tiddler-frame")) {
			lastFrame = node;
		}
		node = node.nextElementSibling;
	}
	var current = parseFloat(frontdrop.style.minHeight) || 0;
	if(!lastFrame) {
		if(current) {
			frontdrop.style.minHeight = "";
		}
		return;
	}
	var margin = parseFloat(getComputedStyle(lastFrame).scrollMarginTop) || 0,
		neededMaxScroll = docTop(scroller, lastFrame) - margin,
		currentMaxScroll = scroller.scrollHeight - scroller.clientHeight,
		filler = Math.max(0, Math.round(current + neededMaxScroll - currentMaxScroll));
	if(Math.abs(filler - current) > 1) {
		frontdrop.style.minHeight = filler ? filler + "px" : "";
	}
}

/*
 * True when `element` belongs to the FIRST tiddler frame of the story river (no other
 * .tc-tiddler-frame sibling before it). Used to special-case the scroll destination: the
 * first tiddler should land at scrollTop 0, so the full 42px resting margin-top of
 * .story-backdrop shows above it, instead of the smaller post-click scroll-margin-top gap.
 */
function isFirstStoryFrame(element) {
	var frame = element.closest && element.closest(".tc-tiddler-frame");
	if(!frame) {
		return false;
	}
	var node = frame.previousElementSibling;
	while(node) {
		if(node.classList.contains("tc-tiddler-frame")) {
			return false;
		}
		node = node.previousElementSibling;
	}
	return true;
}

/*
 * Scroll the river so that `element` lands at the top of the viewport, offset by its CSS
 * scroll-margin-top (set on .tc-tiddler-frame in base.css) — or at scrollTop 0 when the
 * target is the first tiddler of the story (see isFirstStoryFrame). A native smooth
 * element.scrollIntoView() is NOT usable here: it snapshots the destination at call time,
 * but TW's classic storyview animations (insert of a newly-opened tiddler, removal of a
 * saved draft) are still shifting the layout for the whole animation duration — the element
 * settles somewhere else and the scroll lands wrong. Instead this rAF loop re-reads the
 * element's position every frame, so the easing converges on the element's real position;
 * both run over the same $tw animation duration, so layout is settled by the final frame.
 * A short settle phase then absorbs any late layout shifts (transition end jitter).
 */
function scrollRiverToElement(scroller, element, callback, options) {
	var duration = (options && options.animationDuration !== undefined) ?
			parseInt(options.animationDuration) : $tw.utils.getAnimationDuration(),
		startTime = Date.now(),
		startPos = scroller.scrollTop,
		settleUntil = 0,
		stableFrames = 0;
	cancelRiverScroll(scroller);
	var state = {cancelled: false, id: null};
	scroller._slActiveScroll = state;
	var endPos = function() {
		updateOverscroll(scroller);
		if(isFirstStoryFrame(element)) {
			return 0;
		}
		var margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0,
			maxScroll = scroller.scrollHeight - scroller.clientHeight;
		return Math.max(0, Math.min(docTop(scroller, element) - margin, maxScroll));
	};
	var step = function() {
		if(state.cancelled || !scroller.isConnected || !element.isConnected) {
			return;
		}
		if(!settleUntil) {
			// Main phase: ease from the start position towards the live end position
			var t = duration <= 0 ? 1 : (Date.now() - startTime) / duration;
			if(t >= 1) {
				t = 1;
			}
			scroller.scrollTop = startPos + (endPos() - startPos) * $tw.utils.slowInSlowOut(t);
			if(t >= 1) {
				settleUntil = Date.now() + 400;
				if(callback) {
					callback();
				}
			}
			state.id = requestAnimationFrame(step);
		} else {
			// Settle phase: snap to the end position until the layout stops moving
			var end = endPos();
			if(Math.abs(scroller.scrollTop - end) < 0.5) {
				stableFrames++;
			} else {
				stableFrames = 0;
				scroller.scrollTop = end;
			}
			if(stableFrames < 3 && Date.now() < settleUntil) {
				state.id = requestAnimationFrame(step);
			} else {
				scroller._slActiveScroll = null;
			}
		}
	};
	step();
}

function cancelRiverScroll(scroller) {
	var state = scroller._slActiveScroll;
	if(state) {
		state.cancelled = true;
		if(state.id) {
			cancelAnimationFrame(state.id);
		}
		scroller._slActiveScroll = null;
	}
}

/*
 * Per-river one-time setup: hand scrolling back to the user as soon as they interact, and
 * keep the overscroll filler in sync with content/viewport size changes (editor typing,
 * images loading, window resize) via a ResizeObserver on both the scroller and its content.
 */
var preparedRivers = typeof WeakSet !== "undefined" ? new WeakSet() : {has: function() {return false;}, add: function() {}};

function prepareRiver(scroller) {
	if(preparedRivers.has(scroller)) {
		return;
	}
	preparedRivers.add(scroller);
	updateScrollbarWidthVar(scroller);
	$tw.utils.each(["wheel", "touchstart", "mousedown"], function(type) {
		scroller.addEventListener(type, function() {
			cancelRiverScroll(scroller);
		}, {passive: true});
	});
	if(typeof ResizeObserver !== "undefined") {
		var pending = false;
		var observer = new ResizeObserver(function() {
			// Defer to a frame boundary; updateOverscroll self-stabilises (no-op when exact)
			if(!pending) {
				pending = true;
				requestAnimationFrame(function() {
					pending = false;
					if(scroller.isConnected) {
						updateScrollbarWidthVar(scroller);
						updateOverscroll(scroller);
					} else {
						observer.disconnect();
					}
				});
			}
		});
		observer.observe(scroller);
		if(scroller.firstElementChild) {
			observer.observe(scroller.firstElementChild);
		}
	}
}

exports.startup = function() {
	/*
	 * The classic storyview calls $tw.pageScroller.scrollIntoView() which scrolls the window —
	 * but when the story river is a $scrollable widget, the window doesn't scroll (overflow:hidden
	 * on body). This only matters for tm-scroll events that reach $tw.rootWidget directly (e.g. a
	 * selector-based scroll dispatched from outside the river) — see the $scrollable patch below
	 * for the path actually used by ordinary link-click navigation.
	 */
	var original = $tw.pageScroller.scrollIntoView.bind($tw.pageScroller);

	$tw.pageScroller.scrollIntoView = function(element, callback) {
		/*
		 * Defer to the next animation frame so newly-inserted tiddler DOM nodes have time to
		 * connect to .tc-story-river before we check. Without this rAF, closest() may return
		 * null on a not-yet-attached node and fall through to the window scroller, which does
		 * nothing when body has overflow:hidden.
		 */
		requestAnimationFrame(function() {
			var river = element && element.closest && element.closest(".tc-story-river");
			if(river) {
				prepareRiver(river);
				scrollRiverToElement(river, element, callback);
			} else {
				original(element, callback);
			}
		});
	};

	/*
	 * Add tc-tiddler-stuck when a sticky title has detached from its frame (frame scrolled
	 * above the container top but the title is still pinned and visible).
	 * Scroll events don't bubble — capture phase required.
	 */
	document.addEventListener("scroll", function(e) {
		if(!e.target || !e.target.classList || !e.target.classList.contains("tc-story-river")) {
			return;
		}
		/* tc-tiddler-stuck has no visual effect when the vanilla stickytitles option is off
		   (see styles.tid) — skip the per-title layout reads entirely in that case. */
		if($tw.wiki.getTiddlerText("$:/themes/tiddlywiki/vanilla/options/stickytitles", "yes") !== "yes") {
			return;
		}
		/* Extra px tolerance so 1-pixel rounding doesn't flicker the shadow on/off during scroll */
		var threshold = 1;
		var container = e.target;
		var containerTop = container.getBoundingClientRect().top;
		container.querySelectorAll(".tc-tiddler-title").forEach(function(title) {
			var titleTop = title.getBoundingClientRect().top;
			var frame = title.closest(".tc-tiddler-frame");
			var frameTop = frame ? frame.getBoundingClientRect().top : Infinity;
			title.classList.toggle("tc-tiddler-stuck", titleTop <= containerTop + threshold && frameTop < containerTop);
		});
	}, true);

	/*
	 * $:/core/modules/widgets/scrollable.js absorbs its own "tm-scroll" event internally
	 * (ScrollableWidget.handleScrollEvent always returns false) and never lets it bubble up to
	 * $tw.rootWidget — so $tw.pageScroller.scrollIntoView above is never actually invoked for
	 * ordinary link-click navigation (verified empirically: 0 calls on a river link click, vs.
	 * the widget's own scrollIntoView firing every time). This is the real hook for that case;
	 * patched here to use the same live-tracking scroller as above instead of the widget's own
	 * JS-driven "minimal scroll" math, which (a) ignores scroll-margin-top entirely and (b) can
	 * anchor a short target to the *bottom* of the viewport rather than the top, neither of which
	 * match the intended "flush top + configured gap" landing. Gated to the .tc-story-river
	 * instance since $scrollable is also used by the sidebar, where the original behaviour is
	 * kept unchanged.
	 */
	var ScrollableWidget = Object.getPrototypeOf($tw.rootWidget).widgetClasses.scrollable;
	var originalScrollableScrollIntoView = ScrollableWidget.prototype.scrollIntoView;
	/*
	 * core/modules/startup/story.js always adds the first story tiddler to $:/HistoryList on
	 * boot (openStartupTiddlers -> story.addToHistory), even with no #hash in the URL. That
	 * triggers the exact same tm-scroll -> ScrollableWidget.scrollIntoView path as a real link
	 * click, so without this guard the page-load landing would use the 21px post-click gap
	 * instead of the 42px resting margin-top (see .story-backdrop in base.css).
	 * scrollTop can't just be left alone here: Chrome/Firefox natively restore the scroll
	 * offset of arbitrary scrollable elements (not just window) across a full page reload
	 * (document.location.reload(), which is what livereload triggers — see dev-livereload.cjs),
	 * so the river may already be sitting at a stale non-zero offset before this code even runs.
	 * Force it back to 0 explicitly instead of assuming it starts there.
	 */
	var hasScrolledOnce = false;
	ScrollableWidget.prototype.scrollIntoView = function(element, callback, options) {
		var isRiver = this.outerDomNode && this.outerDomNode.classList.contains("tc-story-river");
		if(isRiver && !hasScrolledOnce) {
			hasScrolledOnce = true;
			this.outerDomNode.scrollTop = 0;
			prepareRiver(this.outerDomNode);
			return;
		}
		if(isRiver && element) {
			prepareRiver(this.outerDomNode);
			scrollRiverToElement(this.outerDomNode, element, callback, options);
			return;
		}
		originalScrollableScrollIntoView.call(this, element, callback, options);
	};
};

})();
