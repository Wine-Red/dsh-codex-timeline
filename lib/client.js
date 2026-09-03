window.__ModuleLoader__.load({
	id: "dsh-codex-timeline",
	factory: (require) => {
		const module = { exports: {} };
		const exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");
		const { jsx, jsxs } = require("react/jsx-runtime");
		const {
			useCallback,
			useEffect,
			useMemo,
			useRef,
			useState,
			useSyncExternalStore
		} = React;

		const NS = "codex-navigation-enhancer";
		const SETTINGS_URL = "/codex-timeline/settings";
		const SEARCH_URL = "/codex-timeline/search";
		const DEFAULT_PREFERENCES = Object.freeze({
			enabled: true,
			favorites: [],
			side: "left",
			leftOffset: 0,
			centerOffset: 0,
			markerSpacing: 10,
			recentTurns: 25
		});

		const zh = {
			"action.open": "搜索与收藏",
			"action.close": "关闭搜索与收藏",
			"action.search": "搜索当前会话",
			"action.favorites": "查看收藏轮次",
			"search.placeholder": "搜索当前会话",
			"search.hint": "输入关键词搜索全部历史，或从最近轮次中选择。",
			"search.loading": "正在读取会话索引…",
			"search.count": "找到 {count} 条",
			"search.none": "没有匹配结果，请尝试更短或不同的关键词。",
			"search.empty": "当前会话还没有可导航的轮次。",
			"favorites.only": "只看收藏",
			"favorites.all": "显示最近轮次",
			"favorites.none": "还没有收藏；可在结果右侧点星标。",
			"favorites.filterOn": "时间线只显示收藏轮次",
			"favorites.filterOff": "时间线显示全部轮次",
			"favorite.add": "收藏第 {turn} 轮",
			"favorite.remove": "取消收藏第 {turn} 轮",
			"branch": "从第 {turn} 轮分支",
			"branch.unavailable": "该轮尚不可分支",
			"branch.failed": "无法从第 {turn} 轮创建分支，请稍后重试。",
			"jump": "跳转到第 {turn} 轮",
			"jump.loading": "正在载入第 {turn} 轮…",
			"jump.done": "已跳转到第 {turn} 轮",
			"jump.failed": "无法定位第 {turn} 轮",
			"turn": "第 {turn} 轮",
			"status.inProgress": "进行中",
			"status.waiting": "等待确认",
			"status.completed": "已完成",
			"status.failed": "失败",
			"status.unknown": "状态未知",
			"preview.label": "第 {turn} 轮预览",
			"preview.runTime": "耗时 {duration}",
			"preview.ttft": "首 {seconds}秒",
			"preview.tokensPerSecond": "{tps} tok/s",
			"preview.tokens": "入 {input} / 出 {output} tok",
			"preview.inputTokens": "入 {input} tok",
			"preview.outputTokens": "出 {output} tok",
			"duration.seconds": "{seconds}秒",
			"duration.minutes": "{minutes}分{seconds}秒",
			"settings.title": "官方轮次导航增强",
			"settings.description": "沿用 DSH 官方短横导航，增加搜索、收藏、分支快捷操作和布局偏好。",
			"settings.enabled": "启用增强功能",
			"settings.enabledHint": "关闭后仅保留 DSH 官方导航，不显示搜索、收藏、分支和布局覆盖。",
			"settings.showOnRight": "显示在右侧",
			"settings.showOnRightHint": "关闭时把官方导航移到左侧；短横本身仍完全使用官方样式。",
			"settings.leftOffset": "距边缘距离",
			"settings.centerOffset": "向中部偏移",
			"settings.markerSpacing": "标记间距",
			"settings.recentTurns": "窗口显示条数",
			"settings.leftOffsetHint": "导航距所选会话边缘的距离。",
			"settings.centerOffsetHint": "相对会话区域垂直中线的上下偏移。",
			"settings.markerSpacingHint": "相邻官方短横之间的纵向间距。",
			"settings.recentTurnsHint": "导航窗口最多同时容纳的完整轮次数。",
			"settings.turnUnit": " 条",
			"settings.overridden": "已覆盖",
			"settings.reset": "恢复默认",
			"settings.expand": "展开设置",
			"settings.collapse": "收起设置"
		};

		const en = {
			"action.open": "Search and favorites",
			"action.close": "Close search and favorites",
			"action.search": "Search this conversation",
			"action.favorites": "View favorite turns",
			"search.placeholder": "Search this conversation",
			"search.hint": "Search the whole history, or choose a recent turn.",
			"search.loading": "Loading the conversation index…",
			"search.count": "{count} results",
			"search.none": "No matches. Try a shorter or different query.",
			"search.empty": "This conversation has no navigable turns yet.",
			"favorites.only": "Favorites only",
			"favorites.all": "Show recent turns",
			"favorites.none": "No favorites yet; use the star beside a result.",
			"favorites.filterOn": "Show only favorite Turns in the timeline",
			"favorites.filterOff": "Show every Turn in the timeline",
			"favorite.add": "Favorite turn {turn}",
			"favorite.remove": "Remove turn {turn} from favorites",
			"branch": "Branch from turn {turn}",
			"branch.unavailable": "This turn cannot be branched yet",
			"branch.failed": "Could not branch from turn {turn}. Please try again.",
			"jump": "Jump to turn {turn}",
			"jump.loading": "Loading turn {turn}…",
			"jump.done": "Jumped to turn {turn}",
			"jump.failed": "Could not locate turn {turn}",
			"turn": "Turn {turn}",
			"status.inProgress": "In progress",
			"status.waiting": "Waiting for confirmation",
			"status.completed": "Completed",
			"status.failed": "Failed",
			"status.unknown": "Unknown status",
			"preview.label": "Turn {turn} preview",
			"preview.runTime": "Run {duration}",
			"preview.ttft": "TTFT {seconds}s",
			"preview.tokensPerSecond": "{tps} tok/s",
			"preview.tokens": "In {input} · out {output} tok",
			"preview.inputTokens": "Input {input} tok",
			"preview.outputTokens": "Output {output} tok",
			"duration.seconds": "{seconds}s",
			"duration.minutes": "{minutes}m {seconds}s",
			"settings.title": "Official turn navigation enhancer",
			"settings.description": "Keep DSH's official dash rail and add search, favorites, branching, and layout preferences.",
			"settings.enabled": "Enable enhancements",
			"settings.enabledHint": "When off, DSH's official navigation remains without search, favorites, branching, or layout overrides.",
			"settings.showOnRight": "Show on right",
			"settings.showOnRightHint": "When off, move the official rail to the left while keeping its native dash styling.",
			"settings.leftOffset": "Edge offset",
			"settings.centerOffset": "Center offset",
			"settings.markerSpacing": "Marker spacing",
			"settings.recentTurns": "Visible turns",
			"settings.leftOffsetHint": "Distance from the selected conversation edge.",
			"settings.centerOffsetHint": "Vertical offset from the conversation midpoint.",
			"settings.markerSpacingHint": "Vertical pitch between official dash markers.",
			"settings.recentTurnsHint": "Maximum complete turn marks visible in the rail window.",
			"settings.turnUnit": " turns",
			"settings.overridden": "Overridden",
			"settings.reset": "Reset to default",
			"settings.expand": "Show settings",
			"settings.collapse": "Hide settings"
		};

		const css = `
.dsh-navx-root{z-index:110;width:24px;position:fixed;display:flex;flex-direction:column;align-items:center;gap:0}
.dsh-navx-root[data-ready=false]{visibility:hidden;pointer-events:none}
.dsh-navx-trigger{width:24px;height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:transparent;border:0;border-radius:6px;padding:0;position:relative;display:grid;place-items:center}
.dsh-navx-trigger:hover,.dsh-navx-trigger:focus-visible{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}
.dsh-navx-trigger[data-active=true]{color:var(--dsw-alias-state-warn-primary)}
.dsh-navx-trigger:focus-visible,.dsh-navx-iconButton:focus-visible,.dsh-navx-resultMain:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
.dsh-navx-trigger svg{width:14px;height:14px;display:block}.dsh-navx-iconButton svg{width:16px;height:16px;display:block}
.dsh-navx-panel{z-index:120;box-sizing:border-box;width:min(360px,calc(100vw - 24px));max-height:min(520px,calc(100vh - 96px));border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);background:var(--dsw-specific-menu);box-shadow:var(--dsw-shadow-lv3);border-radius:12px;padding:8px;position:absolute;top:0;display:flex;flex-direction:column;gap:6px}
.dsh-navx-root[data-side=left] .dsh-navx-panel{left:calc(100% + 8px)}
.dsh-navx-root[data-side=right] .dsh-navx-panel{right:calc(100% + 8px)}
.dsh-navx-search{height:36px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l3);border-radius:8px;display:flex;align-items:center;gap:7px;padding:0 9px}
.dsh-navx-search:focus-within{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary)}
.dsh-navx-search svg{width:15px;height:15px;color:var(--dsw-alias-label-tertiary);flex:none}
.dsh-navx-input{min-width:0;width:100%;height:34px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13);background:transparent;border:0;outline:0;padding:0}
.dsh-navx-input::placeholder{color:var(--dsw-alias-label-caption)}
.dsh-navx-toolbar{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:0 2px}
.dsh-navx-count,.dsh-navx-state{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.dsh-navx-state{padding:14px 10px;line-height:18px;text-align:center}
.dsh-navx-error{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l3);border-radius:7px;padding:7px 9px;font:var(--dsw-font-xxs-12);line-height:18px}
.dsh-navx-results{min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px}
.dsh-navx-result{min-width:0;border-radius:8px;display:grid;grid-template-columns:minmax(0,1fr) 30px 30px;align-items:stretch}
.dsh-navx-result:hover,.dsh-navx-result:focus-within{background:var(--dsw-alias-interactive-bg-hover-solid)}
.dsh-navx-resultMain{min-width:0;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;background:transparent;border:0;border-radius:8px;padding:7px 8px;display:grid;gap:2px}
.dsh-navx-resultMeta{display:flex;align-items:center;gap:7px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.dsh-navx-resultSummary{white-space:normal;-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden;font:var(--dsw-font-xs-13);line-height:18px}
.dsh-navx-resultResponse{color:var(--dsw-alias-label-caption);white-space:normal;-webkit-line-clamp:1;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden;font:var(--dsw-font-xxs-12);line-height:17px}
.dsh-navx-iconButton{width:28px;height:28px;align-self:center;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:transparent;border:0;border-radius:6px;padding:0;display:grid;place-items:center}
.dsh-navx-iconButton:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dsh-navx-iconButton:disabled{cursor:default;opacity:.35}
.dsh-navx-iconButton[data-active=true]{color:var(--dsw-alias-state-warn-primary)}
.dsh-navx-live{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;clip:rect(0 0 0 0);overflow:hidden}
.dsh-navx-preview{z-index:121;box-sizing:border-box;width:min(320px,calc(100vw - 88px));max-height:min(250px,calc(100dvh - 96px));color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:var(--dsw-shadow-lv2);padding:10px 12px;position:fixed;overflow:auto;animation:dsh-navx-preview-in .12s ease-out}
.dsh-navx-previewMeta{min-width:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);display:flex;align-items:center;justify-content:space-between;gap:8px}
.dsh-navx-previewMetaText{min-width:0;display:flex;align-items:center;gap:7px}
.dsh-navx-previewMeta strong{color:var(--dsw-alias-label-primary)}
.dsh-navx-previewInlineActions{flex:none;display:flex;align-items:center;gap:1px}
.dsh-navx-previewInlineButton{width:22px;height:22px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:transparent;border:0;border-radius:5px;padding:0;display:grid;place-items:center}
.dsh-navx-previewInlineButton svg{width:13px;height:13px;display:block}
.dsh-navx-previewInlineButton:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dsh-navx-previewInlineButton:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:0}
.dsh-navx-previewInlineButton:disabled{cursor:default;opacity:.35}
.dsh-navx-previewInlineButton[data-active=true]{color:var(--dsw-alias-state-warn-primary)}
.dsh-navx-previewStats{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);line-height:16px;margin-top:3px}
.dsh-navx-previewSummary,.dsh-navx-previewResponse{white-space:normal;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}
.dsh-navx-previewSummary{font:var(--dsw-font-xs-strong-13);line-height:18px;-webkit-line-clamp:2;margin-top:5px}
.dsh-navx-previewResponse{color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12);line-height:17px;-webkit-line-clamp:3;margin-top:4px}
.dsh-navx-settingsCard{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;list-style:none;transition:border-color .16s,background .16s}
.dsh-navx-settingsCard:hover{border-color:var(--dsw-alias-label-dimmed)}
.dsh-navx-settingsCard[data-open=true]{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}
.dsh-navx-settingsHeader{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:transparent;border:0;border-radius:12px;display:flex;align-items:center;gap:12px;padding:14px 16px}
.dsh-navx-settingsHeader:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.dsh-navx-settingsHeadText{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}
.dsh-navx-settingsName{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}
.dsh-navx-settingsDescription{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}
.dsh-navx-settingsChevron{width:14px;height:14px;color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}
.dsh-navx-settingsCard[data-open=true] .dsh-navx-settingsChevron{transform:rotate(180deg)}
.dsh-navx-settingsBody{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}
.dsh-navx-setting{display:flex;flex-direction:column;gap:6px;padding:12px 0}
.dsh-navx-setting+.dsh-navx-setting{border-top:1px solid var(--dsw-alias-border-l2)}
.dsh-navx-settingHead{display:flex;align-items:center;gap:8px}
.dsh-navx-settingLabel{min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:13px;font-weight:500;line-height:1.5}
.dsh-navx-settingBadges{display:inline-flex;align-items:center;gap:8px}
.dsh-navx-settingBadge{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}
.dsh-navx-settingValue{white-space:nowrap;color:var(--dsw-alias-label-tertiary);border-radius:999px;padding:1px 8px;font-size:11px;line-height:17px}
.dsh-navx-settingReset{font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:transparent;border:0;padding:0;font-size:12px;line-height:1.5}
.dsh-navx-settingReset:hover{color:var(--dsw-alias-label-primary)}
.dsh-navx-settingReset:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-navx-settingHint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}
.dsh-navx-settingRange{width:100%;cursor:pointer;accent-color:var(--dsw-alias-brand-primary)}
.dsh-navx-settingSwitch{min-height:34px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-14);text-align:left;background:transparent;border:0;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:0;cursor:pointer}
.dsh-navx-settingSwitchTrack{width:32px;height:18px;background:var(--dsw-alias-interactive-bg-hover-solid);border-radius:10px;flex:none;position:relative}
.dsh-navx-settingSwitchTrack span{width:14px;height:14px;background:var(--dsw-alias-label-tertiary);border-radius:50%;transition:transform .12s,background .12s;position:absolute;top:2px;left:2px}
.dsh-navx-settingSwitch[aria-checked=true] .dsh-navx-settingSwitchTrack{background:var(--dsw-alias-brand-primary)}
.dsh-navx-settingSwitch[aria-checked=true] .dsh-navx-settingSwitchTrack span{background:var(--dsw-alias-bg-overlay);transform:translateX(14px)}
.dsh-navx-settingSwitch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
nav[data-dsh-navigation-enhanced=true]{width:36px;margin-top:var(--dsh-navx-center-offset,0px)}
nav[data-dsh-navigation-enhanced=true][data-dsh-navigation-side=right]{left:auto;right:calc(12px - (var(--dsh-composer-side-clearance) + 16px) + var(--dsh-navx-edge-offset,0px))}
nav[data-dsh-navigation-enhanced=true][data-dsh-navigation-side=left]{right:auto;left:calc(12px - (var(--dsh-composer-side-clearance) + 16px) + var(--dsh-navx-edge-offset,0px))}
nav[data-dsh-navigation-enhanced=true]>[role=tooltip]{visibility:hidden!important}
nav[data-dsh-navigation-enhanced=true][data-dsh-navigation-side=left] [data-dsh-navx-mark=true]{inset:0 auto 0 0}
nav[data-dsh-navigation-enhanced=true][data-dsh-navigation-side=left] [data-dsh-navx-mark=true]::before{right:auto;left:0}
nav[data-dsh-navigation-enhanced=true][data-dsh-navigation-side=right] [data-dsh-navx-mark=true]{inset:0 0 0 auto}
nav[data-dsh-navigation-enhanced=true][data-dsh-navigation-side=right] [data-dsh-navx-mark=true]::before{right:0;left:auto}
nav[data-dsh-navigation-enhanced=true] button[aria-describedby]::before{width:12px;background:var(--dsw-alias-border-l4)}
nav[data-dsh-navigation-enhanced=true] button[data-dsh-navx-mark=true]::before{width:8px!important;background:var(--dsw-alias-border-l4)!important;opacity:.55!important;transition:width .18s cubic-bezier(.22,.75,.18,1),background-color .16s ease-out,opacity .16s ease-out}
nav[data-dsh-navigation-enhanced=true]:not([data-dsh-navigation-interacting=true]) button[aria-current=true]::before{background:var(--dsw-alias-label-primary)!important;opacity:.72!important}
nav[data-dsh-navigation-enhanced=true][data-dsh-navigation-interacting=true] button[data-dsh-navx-step="3"]::before{width:12px!important;background:var(--dsw-alias-label-tertiary)!important;opacity:.46!important}
nav[data-dsh-navigation-enhanced=true][data-dsh-navigation-interacting=true] button[data-dsh-navx-step="2"]::before{width:18px!important;background:var(--dsw-alias-label-tertiary)!important;opacity:.58!important}
nav[data-dsh-navigation-enhanced=true][data-dsh-navigation-interacting=true] button[data-dsh-navx-step="1"]::before{width:24px!important;background:var(--dsw-alias-label-tertiary)!important;opacity:.72!important}
nav[data-dsh-navigation-enhanced=true][data-dsh-navigation-interacting=true] button[data-dsh-navx-step="0"]::before{width:30px!important;background:var(--dsw-alias-label-primary)!important;opacity:.9!important}
@keyframes dsh-navx-preview-in{0%{opacity:0;transform:translateX(var(--dsh-navx-preview-enter,4px))}100%{opacity:1;transform:translateX(0)}}
@media (prefers-reduced-motion:reduce){.dsh-navx-preview{animation:none!important}.dsh-navx-panel{scroll-behavior:auto}.dsh-navx-settingsCard,.dsh-navx-settingsChevron,.dsh-navx-settingSwitchTrack span,nav[data-dsh-navigation-enhanced=true] button[data-dsh-navx-mark=true]::before{transition:none}}
@media (forced-colors:active){.dsh-navx-settingSwitchTrack,.dsh-navx-settingSwitchTrack span{border:1px solid CanvasText}}
@media (pointer:coarse){.dsh-navx-root{width:44px;gap:4px}.dsh-navx-trigger{width:44px;height:44px}.dsh-navx-iconButton{width:44px;height:44px}.dsh-navx-previewInlineButton{width:32px;height:32px}}
@media (max-width:720px){.dsh-navx-panel{position:fixed;top:56px;width:auto;max-height:calc(100dvh - 80px)}.dsh-navx-root[data-side=right] .dsh-navx-panel{right:60px!important;left:12px!important}.dsh-navx-root[data-side=left] .dsh-navx-panel{right:12px!important;left:60px!important}.dsh-navx-preview{right:44px!important;left:44px!important;width:auto}}
`;

		function ensureStyles() {
			if (typeof document === "undefined") return;
			if (document.querySelector('style[data-plugin-css="dsh-codex-timeline/navigation-enhancer"]') !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-codex-timeline";
			tag.dataset.pluginCss = "dsh-codex-timeline/navigation-enhancer";
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		function hostBase() {
			const origin = globalThis.location?.origin;
			return origin !== undefined && origin !== "null" ? origin : "http://dsh.internal";
		}

		function samePreferences(left, right) {
			return left.enabled === right.enabled && left.side === right.side && left.leftOffset === right.leftOffset && left.centerOffset === right.centerOffset && left.markerSpacing === right.markerSpacing && left.recentTurns === right.recentTurns && left.favorites.length === right.favorites.length && left.favorites.every((id, index) => id === right.favorites[index]);
		}

		class NavigationPreferences {
			constructor() {
				this.snapshot = DEFAULT_PREFERENCES;
				this.listeners = new Set();
				this.writeQueue = Promise.resolve();
				this.load();
			}
			getSnapshot = () => this.snapshot;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => this.listeners.delete(listener);
			};
			adopt(value) {
				const next = Object.freeze({
					enabled: value?.enabled !== false,
					favorites: Array.isArray(value?.favorites) ? value.favorites.filter((id) => typeof id === "string") : [],
					side: value?.side === "right" ? "right" : "left",
					leftOffset: typeof value?.leftOffset === "number" ? value.leftOffset : DEFAULT_PREFERENCES.leftOffset,
					centerOffset: typeof value?.centerOffset === "number" ? value.centerOffset : DEFAULT_PREFERENCES.centerOffset,
					markerSpacing: typeof value?.markerSpacing === "number" ? value.markerSpacing : DEFAULT_PREFERENCES.markerSpacing,
					recentTurns: typeof value?.recentTurns === "number" ? value.recentTurns : DEFAULT_PREFERENCES.recentTurns
				});
				if (samePreferences(next, this.snapshot)) return;
				this.snapshot = next;
				for (const listener of this.listeners) listener();
			}
			async load() {
				try {
					const response = await fetch(new URL(SETTINGS_URL, hostBase()));
					const data = await response.json();
					if (response.ok && data?.ok === true) this.adopt(data.value);
				} catch (error) {
					console.error("dsh-codex-timeline: failed to read navigation preferences", error);
				}
			}
			set(key, value) {
				this.adopt({ ...this.snapshot, [key]: value });
				this.writeQueue = this.writeQueue.then(async () => {
					try {
						const response = await fetch(new URL(SETTINGS_URL, hostBase()), {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ patch: { [key]: value } })
						});
						const data = await response.json();
						if (response.ok && data?.ok === true) this.adopt(data.value);
						else await this.load();
					} catch (error) {
						console.error("dsh-codex-timeline: failed to persist navigation preferences", error);
						await this.load();
					}
				});
			}
			dispose() {
				this.listeners.clear();
			}
		}

		function usePreferences(source) {
			return useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
		}

		function SearchGlyph() {
			return jsx("svg", { viewBox: "0 0 16 16", fill: "none", "aria-hidden": true, children: jsxs(React.Fragment, { children: [jsx("circle", { cx: "7", cy: "7", r: "4.25", stroke: "currentColor", strokeWidth: "1.4" }), jsx("path", { d: "m10.2 10.2 3.1 3.1", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round" })] }) });
		}

		function StarGlyph({ filled }) {
			return jsx("svg", { viewBox: "0 0 16 16", fill: filled ? "currentColor" : "none", "aria-hidden": true, children: jsx("path", { d: "m8 2.1 1.72 3.49 3.85.56-2.79 2.72.66 3.83L8 10.89 4.56 12.7l.66-3.83-2.79-2.72 3.85-.56L8 2.1Z", stroke: "currentColor", strokeWidth: "1.2", strokeLinejoin: "round" }) });
		}

		function BranchGlyph() {
			return jsx("svg", { viewBox: "0 0 16 16", fill: "none", "aria-hidden": true, children: jsxs(React.Fragment, { children: [jsx("circle", { cx: "5", cy: "3", r: "1.5", stroke: "currentColor", strokeWidth: "1.2" }), jsx("circle", { cx: "11", cy: "6", r: "1.5", stroke: "currentColor", strokeWidth: "1.2" }), jsx("circle", { cx: "5", cy: "13", r: "1.5", stroke: "currentColor", strokeWidth: "1.2" }), jsx("path", { d: "M5 4.5v7M6.5 9.2c2.7 0 4.5-.8 4.5-1.7", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round" })] }) });
		}

		function ChevronGlyph({ className }) {
			return jsx("svg", { className, viewBox: "0 0 14 14", fill: "none", "aria-hidden": true, children: jsx("path", { d: "m3.5 5.25 3.5 3.5 3.5-3.5", stroke: "currentColor", strokeWidth: "1.25", strokeLinecap: "round", strokeLinejoin: "round" }) });
		}

		function officialNavigator() {
			const flows = document.querySelectorAll("[data-chat-flow]");
			for (const flow of flows) {
				const scroll = flow.parentElement;
				if (scroll === null) continue;
				for (const child of scroll.children) {
					if (child === flow) continue;
					const nav = child.querySelector("nav");
					if (nav !== null && nav.querySelector('button[type="button"]') !== null) return nav;
				}
			}
			return null;
		}

		function restoreOfficialNavigator(nav) {
			const owned = nav.dataset.dshNavigationEnhanced === "true" || nav.dataset.dshNavxOriginalHeight !== undefined || nav.querySelector("[data-dsh-navx-original-position]") !== null || nav.querySelector("[data-dsh-navx-original-display]") !== null;
			if (!owned) return;
			for (const position of nav.querySelectorAll("[data-dsh-navx-original-position]")) {
				position.style.setProperty("--turn-natural-position", position.dataset.dshNavxOriginalPosition ?? "");
				delete position.dataset.dshNavxOriginalPosition;
			}
			for (const position of nav.querySelectorAll("[data-dsh-navx-original-display]")) {
				if (position.dataset.dshNavxOriginalDisplay === "") position.style.removeProperty("display");
				else position.style.display = position.dataset.dshNavxOriginalDisplay;
				delete position.dataset.dshNavxOriginalDisplay;
			}
			for (const mark of nav.querySelectorAll("[data-dsh-navx-mark]")) {
				delete mark.dataset.dshNavxMark;
				delete mark.dataset.dshNavxPreview;
				delete mark.dataset.dshNavxStep;
			}
			const natural = nav.dataset.dshNavxOriginalHeight;
			if (natural !== undefined) {
				if (natural === "") nav.style.removeProperty("--turn-natural-height");
				else nav.style.setProperty("--turn-natural-height", natural);
			}
			delete nav.dataset.dshNavxOriginalHeight;
			delete nav.dataset.dshNavigationFilter;
			delete nav.dataset.dshNavigationInteracting;
			nav.style.removeProperty("--dsh-navx-center-offset");
			nav.style.removeProperty("--dsh-navx-edge-offset");
			nav.style.removeProperty("height");
			delete nav.dataset.dshNavigationEnhanced;
			delete nav.dataset.dshNavigationSide;
		}

		function enhanceOfficialNavigator(preferences, favoritesOnly, items) {
			const nav = officialNavigator();
			if (nav === null) return null;
			if (preferences.enabled !== true) return nav;
			if (nav.dataset.dshNavxOriginalHeight === undefined) nav.dataset.dshNavxOriginalHeight = nav.style.getPropertyValue("--turn-natural-height");
			const marks = [...nav.querySelectorAll('button[type="button"]')];
			const positions = marks.map((button) => button.parentElement).filter((element) => element instanceof HTMLElement);
			const spacing = Math.max(6, Math.min(40, Number(preferences.markerSpacing) || 10));
			const inset = 6;
			const favoriteIds = new Set(preferences.favorites);
			const canFilter = favoritesOnly && items.length === marks.length;
			for (const mark of marks) mark.dataset.dshNavxMark = "true";
			let visibleIndex = 0;
			positions.forEach((position, index) => {
				if (position.dataset.dshNavxOriginalPosition === undefined) position.dataset.dshNavxOriginalPosition = position.style.getPropertyValue("--turn-natural-position");
				if (position.dataset.dshNavxOriginalDisplay === undefined) position.dataset.dshNavxOriginalDisplay = position.style.getPropertyValue("display");
				const shown = !canFilter || favoriteIds.has(`turn:${String(items[index]?.turn)}`);
				position.style.display = shown ? position.dataset.dshNavxOriginalDisplay : "none";
				if (shown) {
					position.style.setProperty("--turn-natural-position", `${String(visibleIndex * spacing)}px`);
					visibleIndex += 1;
				}
			});
			const naturalHeight = Math.max(12, (visibleIndex - 1) * spacing + inset * 2);
			const visible = Math.max(5, Math.min(50, Number(preferences.recentTurns) || 25));
			const windowHeight = Math.max(12, (visible - 1) * spacing + inset * 2);
			nav.dataset.dshNavigationEnhanced = "true";
			nav.dataset.dshNavigationSide = preferences.side === "right" ? "right" : "left";
			nav.dataset.dshNavigationFilter = canFilter ? "favorites" : "all";
			nav.style.setProperty("--turn-natural-height", `${String(naturalHeight)}px`);
			nav.style.setProperty("--dsh-navx-edge-offset", `${String(Number(preferences.leftOffset) || 0)}px`);
			nav.style.setProperty("--dsh-navx-center-offset", `${String(Number(preferences.centerOffset) || 0)}px`);
			nav.style.height = `min(var(--turn-natural-height), max(0px, calc(var(--turn-rail-band) - 64px)), ${String(windowHeight)}px)`;
			return nav;
		}

		function previewOfficialRangePreference(preferences, settingKey, value) {
			const nav = officialNavigator();
			if (nav === null || nav.dataset.dshNavigationEnhanced !== "true") return;
			if (settingKey === "leftOffset") {
				nav.style.setProperty("--dsh-navx-edge-offset", `${String(Number(value) || 0)}px`);
				return;
			}
			if (settingKey === "centerOffset") {
				nav.style.setProperty("--dsh-navx-center-offset", `${String(Number(value) || 0)}px`);
				return;
			}
			const spacingValue = settingKey === "markerSpacing" ? value : preferences.markerSpacing;
			const spacing = Math.max(6, Math.min(40, Number(spacingValue) || 10));
			if (settingKey === "markerSpacing") {
				const positions = [...nav.querySelectorAll('button[type="button"]')].map((button) => button.parentElement).filter((element) => element instanceof HTMLElement && element.style.display !== "none");
				positions.forEach((position, index) => position.style.setProperty("--turn-natural-position", `${String(index * spacing)}px`));
				const naturalHeight = Math.max(12, (positions.length - 1) * spacing + 12);
				nav.style.setProperty("--turn-natural-height", `${String(naturalHeight)}px`);
			}
			const visibleValue = settingKey === "recentTurns" ? value : preferences.recentTurns;
			const visible = Math.max(5, Math.min(50, Number(visibleValue) || 25));
			const windowHeight = Math.max(12, (visible - 1) * spacing + 12);
			nav.style.height = `min(var(--turn-natural-height), max(0px, calc(var(--turn-rail-band) - 64px)), ${String(windowHeight)}px)`;
		}

		function conversationScrollport() {
			const flow = document.querySelector("[data-chat-flow]");
			let element = flow?.parentElement ?? null;
			while (element !== null) {
				const style = getComputedStyle(element);
				if (/(auto|scroll)/u.test(style.overflowY)) return element;
				element = element.parentElement;
			}
			return null;
		}

		function navigatorSurface(nav, side, enabled) {
			const scrollport = conversationScrollport();
			if (enabled !== true || scrollport === null) return { nav: null, ready: false, top: 0, left: 0 };
			const viewport = scrollport.getBoundingClientRect();
			const edgeInset = 4;
			const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
			const controlSize = coarse ? 44 : 24;
			const top = Math.max(edgeInset, Math.round(viewport.top + edgeInset));
			const cornerLeft = side === "right" ? viewport.left + scrollport.clientWidth - controlSize - edgeInset : viewport.left + edgeInset;
			const left = Math.max(edgeInset, Math.min(innerWidth - controlSize - edgeInset, Math.round(cornerLeft)));
			return { nav, ready: true, top, left };
		}

		function sameNavigatorSurface(left, right) {
			return left.nav === right.nav && left.ready === right.ready && left.top === right.top && left.left === right.left;
		}

		function useOfficialNavigatorEnhancement(preferences, favoritesOnly, items) {
			const [surface, setSurface] = useState({ nav: null, ready: false, top: 0, left: 0 });
			useEffect(() => {
				let frame = null;
				let current = null;
				const apply = () => {
					frame = null;
					const next = enhanceOfficialNavigator(preferences, favoritesOnly, items);
					if (current !== null && current !== next) restoreOfficialNavigator(current);
					current = next;
					const measured = navigatorSurface(next, preferences.side, preferences.enabled);
					setSurface((value) => sameNavigatorSurface(value, measured) ? value : measured);
				};
				const schedule = () => {
					if (frame !== null) return;
					frame = requestAnimationFrame(apply);
				};
				apply();
				const observer = typeof MutationObserver === "undefined" || document.body === null ? null : new MutationObserver(schedule);
				observer?.observe(document.body, { childList: true, subtree: true });
				window.addEventListener("resize", schedule);
				document.addEventListener("scroll", schedule, true);
				return () => {
					observer?.disconnect();
					window.removeEventListener("resize", schedule);
					document.removeEventListener("scroll", schedule, true);
					if (frame !== null) cancelAnimationFrame(frame);
					if (current !== null) restoreOfficialNavigator(current);
				};
			}, [preferences.enabled, preferences.side, preferences.leftOffset, preferences.centerOffset, preferences.markerSpacing, preferences.recentTurns, preferences.favorites, favoritesOnly, items]);
			return surface;
		}

		function useOfficialPreview(nav, items, previewRef, filterKey) {
			const [preview, setPreview] = useState(null);
			const closeTimerRef = useRef(null);
			const activeButtonRef = useRef(null);
			const cancelClose = useCallback(() => {
				if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
				closeTimerRef.current = null;
			}, []);
			const clearPreview = useCallback(() => {
				cancelClose();
				const navigator = activeButtonRef.current?.closest("nav");
				if (navigator !== null && navigator !== undefined) delete navigator.dataset.dshNavigationInteracting;
				for (const mark of navigator?.querySelectorAll("[data-dsh-navx-step]") ?? []) delete mark.dataset.dshNavxStep;
				if (activeButtonRef.current !== null) delete activeButtonRef.current.dataset.dshNavxPreview;
				activeButtonRef.current = null;
				setPreview(null);
			}, [cancelClose]);
			const closeSoon = useCallback(() => {
				cancelClose();
				closeTimerRef.current = setTimeout(clearPreview, 180);
			}, [cancelClose, clearPreview]);

			useEffect(() => {
				clearPreview();
				if (nav === null) return;
				const allButtons = [...nav.querySelectorAll('button[type="button"]')];
				const itemByButton = new Map(allButtons.map((button, index) => [button, items[index]]));
				const buttons = allButtons.filter((button) => button.parentElement?.style.display !== "none");
				const scroller = buttons[0]?.parentElement?.parentElement?.parentElement ?? null;
				let buttonCenters = [];
				let measureFrame = null;
				let lastPointerY = null;
				const measureButtons = () => {
					buttonCenters = buttons.map((button) => {
						const rect = button.getBoundingClientRect();
						return rect.top + rect.height / 2;
					});
				};
				const reveal = (button) => {
					cancelClose();
					const previousButton = activeButtonRef.current;
					nav.dataset.dshNavigationInteracting = "true";
					if (previousButton !== button) {
						if (previousButton !== null) delete previousButton.dataset.dshNavxPreview;
						const activeIndex = buttons.indexOf(button);
						buttons.forEach((candidate, index) => {
							const distance = Math.abs(index - activeIndex);
							if (distance <= 3) candidate.dataset.dshNavxStep = String(distance);
							else delete candidate.dataset.dshNavxStep;
						});
					}
					activeButtonRef.current = button;
					button.dataset.dshNavxPreview = "true";
					const item = itemByButton.get(button);
					if (item === undefined) {
						setPreview(null);
						return;
					}
					const rect = button.getBoundingClientRect();
					const top = Math.max(84, Math.min(innerHeight - 260, Math.round(rect.top + rect.height / 2 - 74)));
					setPreview((current) => current?.item === item && current.top === top ? current : { item, top, button });
				};
				const nearestButton = (clientY) => buttons.reduce((nearest, button, index) => {
					const distance = Math.abs((buttonCenters[index] ?? clientY) - clientY);
					return nearest === null || distance < nearest.distance ? { button, distance } : nearest;
				}, null)?.button;
				const syncPointerToTrack = () => {
					measureFrame = null;
					measureButtons();
					if (lastPointerY === null) return;
					const button = nearestButton(lastPointerY);
					if (button !== undefined) reveal(button);
				};
				const scheduleMeasure = () => {
					if (measureFrame !== null) return;
					measureFrame = requestAnimationFrame(syncPointerToTrack);
				};
				measureButtons();
				const pointerEnter = (event) => {
					lastPointerY = event.clientY;
					scheduleMeasure();
				};
				const pointerMove = (event) => {
					lastPointerY = event.clientY;
					const button = nearestButton(event.clientY);
					if (button !== undefined) reveal(button);
				};
				const pointerLeave = () => {
					lastPointerY = null;
					closeSoon();
				};
				const wheel = (event) => {
					lastPointerY = event.clientY;
					scheduleMeasure();
				};
				const focusIn = (event) => {
					const button = event.target.closest?.('button[type="button"]');
					if (button !== null && nav.contains(button)) reveal(button);
				};
				const focusOut = (event) => {
					if (previewRef.current?.contains(event.relatedTarget)) cancelClose();
					else closeSoon();
				};
				const keyDown = (event) => {
					if (event.key !== "Tab" || event.shiftKey || activeButtonRef.current === null) return;
					event.preventDefault();
					cancelClose();
					requestAnimationFrame(() => previewRef.current?.querySelector("button")?.focus());
				};
				const routeSpacedClick = (event) => {
					if (event.target.closest?.('button[type="button"]') !== null) return;
					const button = nearestButton(event.clientY);
					if (button === undefined) return;
					event.preventDefault();
					event.stopImmediatePropagation();
					button.click();
				};
				nav.addEventListener("pointermove", pointerMove);
				nav.addEventListener("pointerenter", pointerEnter);
				nav.addEventListener("pointerleave", pointerLeave);
				nav.addEventListener("wheel", wheel, { passive: true });
				nav.addEventListener("focusin", focusIn);
				nav.addEventListener("focusout", focusOut);
				nav.addEventListener("keydown", keyDown);
				nav.addEventListener("click", routeSpacedClick, true);
				scroller?.addEventListener("scroll", scheduleMeasure, { passive: true });
				window.addEventListener("resize", scheduleMeasure);
				const positionObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver(scheduleMeasure);
				positionObserver?.observe(nav, { attributes: true, subtree: true, attributeFilter: ["style"] });
				return () => {
					nav.removeEventListener("pointermove", pointerMove);
				nav.removeEventListener("pointerenter", pointerEnter);
				nav.removeEventListener("pointerleave", pointerLeave);
				nav.removeEventListener("wheel", wheel);
					nav.removeEventListener("focusin", focusIn);
					nav.removeEventListener("focusout", focusOut);
					nav.removeEventListener("keydown", keyDown);
					nav.removeEventListener("click", routeSpacedClick, true);
					scroller?.removeEventListener("scroll", scheduleMeasure);
					window.removeEventListener("resize", scheduleMeasure);
					positionObserver?.disconnect();
					if (measureFrame !== null) cancelAnimationFrame(measureFrame);
					clearPreview();
				};
			}, [cancelClose, clearPreview, closeSoon, filterKey, items, nav, previewRef]);

			useEffect(() => () => cancelClose(), [cancelClose]);
			return { preview, cancelClose, closeSoon, clearPreview };
		}

		function findTurnRow(turn) {
			return document.querySelector(`[data-chat-turn="${String(turn)}"]`);
		}

		function waitForTurnRow(turn, timeoutMs = 5000) {
			const immediate = findTurnRow(turn);
			if (immediate !== null) return Promise.resolve(immediate);
			return new Promise((resolve) => {
				let settled = false;
				const observer = new MutationObserver(() => {
					const row = findTurnRow(turn);
					if (row !== null) finish(row);
				});
				const timer = setTimeout(() => finish(null), timeoutMs);
				const finish = (row) => {
					if (settled) return;
					settled = true;
					observer.disconnect();
					clearTimeout(timer);
					resolve(row);
				};
				observer.observe(document.body, { childList: true, subtree: true });
			});
		}

		async function fetchTurnIndex(sessionId, query, signal) {
			const url = new URL(SEARCH_URL, hostBase());
			url.searchParams.set("sessionId", sessionId);
			if (query === "") url.searchParams.set("lite", "1");
			else {
				url.searchParams.set("q", query);
				url.searchParams.set("limit", "200");
			}
			const response = await fetch(url, { signal });
			const data = await response.json();
			if (!response.ok || data?.ok !== true) throw new Error(data?.error?.message ?? `search failed (${String(response.status)})`);
			return Array.isArray(data.items) ? data.items : [];
		}

		function statusKey(status) {
			return status === "failed" ? "status.failed" : status === "unknown" ? "status.unknown" : status === "waiting" ? "status.waiting" : status === "inProgress" ? "status.inProgress" : "status.completed";
		}

		let sameDayTimeFormatter;
		let datedTimeFormatter;
		function turnTimeLabel(time) {
			if (typeof time !== "number" || !Number.isFinite(time)) return "";
			const date = new Date(time);
			const now = new Date();
			const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
			const formatter = sameDay ? sameDayTimeFormatter ??= new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }) : datedTimeFormatter ??= new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
			return formatter.format(date);
		}

		function formatRunDuration(ms, t) {
			const total = Math.max(0, Math.floor(ms / 1000));
			const minutes = Math.floor(total / 60);
			const seconds = total % 60;
			return minutes > 0 ? `${String(minutes)}:${String(seconds).padStart(2, "0")}` : t("duration.seconds", { seconds });
		}

		function formatLatencySeconds(ms) {
			const seconds = Math.max(0, ms) / 1000;
			return seconds < 10 ? String(Math.round(seconds * 10) / 10) : String(Math.round(seconds));
		}

		function formatTokensPerSecond(value) {
			const clamped = Math.max(0, value);
			return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10);
		}

		function formatCompactTokens(value) {
			const clamped = Math.max(0, value);
			if (clamped < 1000) return String(Math.round(clamped));
			const units = clamped < 1000000 ? [1000, "K"] : [1000000, "M"];
			const scaled = clamped / units[0];
			return `${scaled >= 100 ? String(Math.round(scaled)) : String(Math.round(scaled * 10) / 10)}${units[1]}`;
		}

		function previewPerformance(item, t) {
			const parts = [];
			if (typeof item.startTime === "number") parts.push(t("preview.runTime", { duration: formatRunDuration(Math.max(0, (typeof item.endTime === "number" ? item.endTime : Date.now()) - item.startTime), t) }));
			if (typeof item.ttftMs === "number") parts.push(t("preview.ttft", { seconds: formatLatencySeconds(item.ttftMs) }));
			if (typeof item.tokensPerSecond === "number") parts.push(t("preview.tokensPerSecond", { tps: formatTokensPerSecond(item.tokensPerSecond) }));
			return parts.join(" · ");
		}

		function previewUsage(item, t) {
			const input = typeof item.inputTokens === "number" ? formatCompactTokens(item.inputTokens) : null;
			const output = typeof item.outputTokens === "number" ? formatCompactTokens(item.outputTokens) : null;
			if (input !== null && output !== null) return t("preview.tokens", { input, output });
			if (input !== null) return t("preview.inputTokens", { input });
			if (output !== null) return t("preview.outputTokens", { output });
			return "";
		}

		function previewPositionStyle(surface, side, top) {
			const rect = surface.nav?.getBoundingClientRect();
			if (side === "right") return { top, right: Math.max(8, innerWidth - (rect?.left ?? surface.left) + 10), "--dsh-navx-preview-enter": "4px" };
			return { top, left: Math.min(innerWidth - 328, (rect?.right ?? surface.left + 28) + 10), "--dsh-navx-preview-enter": "-4px" };
		}

		function TurnPreview({ preview, surface, side, favorite, busy, onFavorite, onBranch, previewRef, cancelClose, closeSoon, clearPreview, t }) {
			const item = preview.item;
			const canBranch = item.branchUnavailable !== true && Number.isSafeInteger(item.branchSeq);
			const performance = previewPerformance(item, t);
			const usage = previewUsage(item, t);
			const stats = [performance, usage].filter((value) => value !== "").join(" · ");
			return jsxs("section", { ref: previewRef, className: "dsh-navx-preview", style: previewPositionStyle(surface, side, preview.top), role: "dialog", "aria-label": t("preview.label", { turn: item.turn }), onPointerEnter: cancelClose, onPointerLeave: closeSoon, onFocus: cancelClose, onBlur: (event) => {
				if (!event.currentTarget.contains(event.relatedTarget)) closeSoon();
			}, onKeyDown: (event) => {
				if (event.key === "Tab") {
					const actions = [...event.currentTarget.querySelectorAll("button")];
					if (event.shiftKey && event.target === actions[0]) {
						event.preventDefault();
						preview.button?.focus();
					} else if (!event.shiftKey && event.target === actions.at(-1)) {
						event.preventDefault();
						const marks = [...surface.nav?.querySelectorAll('button[type="button"]') ?? []].filter((button) => button.parentElement?.style.display !== "none");
						const next = marks[marks.indexOf(preview.button) + 1];
						(next ?? preview.button)?.focus();
					}
					return;
				}
				if (event.key === "Escape") {
					event.preventDefault();
					preview.button?.focus();
					clearPreview();
				}
			}, children: [jsxs("div", { className: "dsh-navx-previewMeta", children: [jsxs("div", { className: "dsh-navx-previewMetaText", children: [jsx("strong", { children: t("turn", { turn: item.turn }) }), turnTimeLabel(item.time) !== "" ? jsx("span", { children: turnTimeLabel(item.time) }) : null, jsx("span", { children: t(statusKey(item.status)) })] }), jsxs("div", { className: "dsh-navx-previewInlineActions", children: [jsx("button", { type: "button", className: "dsh-navx-previewInlineButton", "data-active": favorite || undefined, "aria-pressed": favorite, "aria-label": t(favorite ? "favorite.remove" : "favorite.add", { turn: item.turn }), title: t(favorite ? "favorite.remove" : "favorite.add", { turn: item.turn }), onClick: () => onFavorite(item), children: jsx(StarGlyph, { filled: favorite }) }), jsx("button", { type: "button", className: "dsh-navx-previewInlineButton", disabled: !canBranch || busy, "aria-label": t(canBranch ? "branch" : "branch.unavailable", { turn: item.turn }), title: t(canBranch ? "branch" : "branch.unavailable", { turn: item.turn }), onClick: () => canBranch && onBranch(item), children: jsx(BranchGlyph, {}) })] })] }), stats !== "" ? jsx("div", { className: "dsh-navx-previewStats", children: stats }) : null, jsx("div", { className: "dsh-navx-previewSummary", children: item.summary || t("turn", { turn: item.turn }) }), item.answer ? jsx("div", { className: "dsh-navx-previewResponse", children: item.answer }) : null] });
		}

		function NavigationResult({ item, favorite, busy, onNavigate, onFavorite, onBranch, t }) {
			const canBranch = item.branchUnavailable !== true && Number.isSafeInteger(item.branchSeq);
			return jsxs("div", { className: "dsh-navx-result", children: [jsxs("button", { type: "button", className: "dsh-navx-resultMain", disabled: busy, onClick: () => onNavigate(item), "aria-label": t("jump", { turn: item.turn }), children: [jsxs("span", { className: "dsh-navx-resultMeta", children: [jsx("strong", { children: t("turn", { turn: item.turn }) }), jsx("span", { children: t(statusKey(item.status)) })] }), jsx("span", { className: "dsh-navx-resultSummary", children: item.summary || t("turn", { turn: item.turn }) }), item.answer ? jsx("span", { className: "dsh-navx-resultResponse", children: item.answer }) : null] }), jsx("button", { type: "button", className: "dsh-navx-iconButton", "data-active": favorite || undefined, "aria-pressed": favorite, "aria-label": t(favorite ? "favorite.remove" : "favorite.add", { turn: item.turn }), title: t(favorite ? "favorite.remove" : "favorite.add", { turn: item.turn }), onClick: () => onFavorite(item), children: jsx(StarGlyph, { filled: favorite }) }), jsx("button", { type: "button", className: "dsh-navx-iconButton", disabled: !canBranch || busy, "aria-label": t(canBranch ? "branch" : "branch.unavailable", { turn: item.turn }), title: t(canBranch ? "branch" : "branch.unavailable", { turn: item.turn }), onClick: () => canBranch && onBranch(item), children: jsx(BranchGlyph, {}) })] });
		}

		function NavigationAction({ sessionId, preferences, setPreference, loadThrough, forkAt, t }) {
			const value = usePreferences(preferences);
			const [open, setOpen] = useState(false);
			const [query, setQuery] = useState("");
			const [indexItems, setIndexItems] = useState([]);
			const [searchItems, setSearchItems] = useState([]);
			const [favoritesOnly, setFavoritesOnly] = useState(false);
			const [indexLoading, setIndexLoading] = useState(false);
			const [searchLoading, setSearchLoading] = useState(false);
			const [busyTurn, setBusyTurn] = useState(null);
			const [notice, setNotice] = useState("");
			const [errorMessage, setErrorMessage] = useState("");
			const surface = useOfficialNavigatorEnhancement(value, favoritesOnly, indexItems);
			const inputRef = useRef(null);
			const rootRef = useRef(null);
			const previewRef = useRef(null);
			const previewState = useOfficialPreview(surface.nav, indexItems, previewRef, favoritesOnly);

			useEffect(() => {
				if (value.enabled !== true) return;
				const controller = new AbortController();
				setIndexLoading(true);
				setErrorMessage("");
				fetchTurnIndex(sessionId, "", controller.signal).then(setIndexItems).catch((error) => {
					if (error?.name !== "AbortError") {
						const message = error instanceof Error ? error.message : String(error);
						setNotice(message);
						setErrorMessage(message);
					}
				}).finally(() => setIndexLoading(false));
				return () => controller.abort();
			}, [sessionId, value.enabled]);

			useEffect(() => {
				if (!open) return;
				requestAnimationFrame(() => inputRef.current?.focus());
			}, [open]);

			useEffect(() => {
				if (!open || query.trim() === "") {
					setSearchItems([]);
					setSearchLoading(false);
					return;
				}
				const controller = new AbortController();
				const timer = setTimeout(() => {
					setSearchLoading(true);
					setErrorMessage("");
					fetchTurnIndex(sessionId, query.trim(), controller.signal).then(setSearchItems).catch((error) => {
						if (error?.name !== "AbortError") {
							const message = error instanceof Error ? error.message : String(error);
							setNotice(message);
							setErrorMessage(message);
						}
					}).finally(() => setSearchLoading(false));
				}, 180);
				return () => {
					clearTimeout(timer);
					controller.abort();
				};
			}, [open, query, sessionId]);

			useEffect(() => {
				if (!open) return;
				const closeOutside = (event) => {
					if (rootRef.current !== null && !rootRef.current.contains(event.target)) setOpen(false);
				};
				const closeEscape = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				document.addEventListener("pointerdown", closeOutside);
				document.addEventListener("keydown", closeEscape);
				return () => {
					document.removeEventListener("pointerdown", closeOutside);
					document.removeEventListener("keydown", closeEscape);
				};
			}, [open]);

			const favoriteIds = useMemo(() => new Set(value.favorites), [value.favorites]);
			const resultItems = useMemo(() => {
				const searched = query.trim() !== "";
				const source = searched ? searchItems : indexItems;
				if (searched) return source;
				return source.slice(-Math.max(5, value.recentTurns));
			}, [indexItems, query, searchItems, value.recentTurns]);
			const loading = query.trim() !== "" ? searchLoading : indexLoading;

			const toggleFavorite = useCallback((item) => {
				const id = `turn:${String(item.turn)}`;
				const next = value.favorites.includes(id) ? value.favorites.filter((candidate) => candidate !== id) : [...value.favorites, id];
				setPreference("favorites", next);
			}, [setPreference, value.favorites]);

			const navigate = useCallback(async (item) => {
				setBusyTurn(item.turn);
				setErrorMessage("");
				setNotice(t("jump.loading", { turn: item.turn }));
				try {
					let row = findTurnRow(item.turn);
					if (row === null && Number.isSafeInteger(item.seq)) {
						await loadThrough(item.seq);
						row = await waitForTurnRow(item.turn);
					}
					if (row === null) throw new Error(t("jump.failed", { turn: item.turn }));
					const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
					row.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
					setNotice(t("jump.done", { turn: item.turn }));
					setOpen(false);
				} catch {
					const message = t("jump.failed", { turn: item.turn });
					setNotice(message);
					setErrorMessage(message);
				} finally {
					setBusyTurn(null);
				}
			}, [loadThrough, t]);

			const branch = useCallback(async (item) => {
				if (!Number.isSafeInteger(item.branchSeq)) return;
				setBusyTurn(item.turn);
				setErrorMessage("");
				try {
					await forkAt(item.branchSeq);
					setOpen(false);
				} catch {
					const message = t("branch.failed", { turn: item.turn });
					setNotice(message);
					setErrorMessage(message);
				} finally {
					setBusyTurn(null);
				}
			}, [forkAt, t]);

			if (value.enabled !== true) return null;
			const emptyMessage = query.trim() !== "" ? t("search.none") : t("search.empty");
			const searchExpanded = open;
			const openSearch = () => {
				setOpen((current) => !current);
			};
			const filterFavorites = () => {
				setOpen(false);
				setFavoritesOnly((current) => !current);
			};
			return jsxs("div", { ref: rootRef, className: "dsh-navx-root", "data-ready": surface.ready, "data-side": value.side, style: { top: surface.top, left: surface.left }, children: [jsx("button", { type: "button", className: "dsh-navx-trigger", "aria-label": t(searchExpanded ? "action.close" : "action.search"), title: t(searchExpanded ? "action.close" : "action.search"), "aria-expanded": searchExpanded, onClick: openSearch, children: jsx(SearchGlyph, {}) }), jsx("button", { type: "button", className: "dsh-navx-trigger", "data-active": favoritesOnly || undefined, "aria-label": t(favoritesOnly ? "favorites.filterOff" : "favorites.filterOn"), title: t(favoritesOnly ? "favorites.filterOff" : "favorites.filterOn"), "aria-pressed": favoritesOnly, onClick: filterFavorites, children: jsx(StarGlyph, { filled: favoritesOnly }) }), open ? jsxs("section", { className: "dsh-navx-panel", role: "dialog", "aria-label": t("action.open"), children: [jsxs("label", { className: "dsh-navx-search", children: [jsx(SearchGlyph, {}), jsx("input", { ref: inputRef, className: "dsh-navx-input", type: "search", value: query, placeholder: t("search.placeholder"), "aria-label": t("search.placeholder"), onChange: (event) => setQuery(event.target.value) })] }), jsx("div", { className: "dsh-navx-toolbar", children: jsx("span", { className: "dsh-navx-count", children: loading ? t("search.loading") : query.trim() !== "" ? t("search.count", { count: resultItems.length }) : t("search.hint") }) }), errorMessage !== "" ? jsx("div", { className: "dsh-navx-error", role: "alert", children: errorMessage }) : null, resultItems.length === 0 ? jsx("div", { className: "dsh-navx-state", children: emptyMessage }) : jsx("div", { className: "dsh-navx-results", children: resultItems.map((item) => jsx(NavigationResult, { item, favorite: favoriteIds.has(`turn:${String(item.turn)}`), busy: busyTurn !== null, onNavigate: navigate, onFavorite: toggleFavorite, onBranch: branch, t }, item.turn)) }), jsx("span", { className: "dsh-navx-live", role: "status", "aria-live": "polite", children: notice })] }) : null, previewState.preview !== null ? jsx(TurnPreview, { preview: previewState.preview, surface, side: value.side, favorite: favoriteIds.has(`turn:${String(previewState.preview.item.turn)}`), busy: busyTurn !== null, onFavorite: toggleFavorite, onBranch: branch, previewRef, cancelClose: previewState.cancelClose, closeSoon: previewState.closeSoon, clearPreview: previewState.clearPreview, t }) : null] });
		}

		function SettingSwitch({ label, checked, onChange }) {
			return jsxs("button", { type: "button", role: "switch", "aria-checked": checked, className: "dsh-navx-settingSwitch", onClick: () => onChange(!checked), children: [jsx("span", { children: label }), jsx("span", { className: "dsh-navx-settingSwitchTrack", "aria-hidden": true, children: jsx("span", {}) })] });
		}

		function RangeSetting({ settingKey, label, hint, value, min, max, unit, preferences, setPreference, t }) {
			const inputId = `dsh-codex-timeline-${settingKey.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)}`;
			const [draft, setDraft] = useState(value);
			const draftRef = useRef(value);
			const persistedRef = useRef(value);
			const interactingRef = useRef(false);
			const previewFrameRef = useRef(null);
			const pendingPreviewRef = useRef(value);
			useEffect(() => {
				persistedRef.current = value;
				if (interactingRef.current) return;
				draftRef.current = value;
				pendingPreviewRef.current = value;
				setDraft(value);
			}, [value]);
			useEffect(() => () => {
				if (previewFrameRef.current !== null) cancelAnimationFrame(previewFrameRef.current);
			}, []);
			const preview = (next) => {
				pendingPreviewRef.current = next;
				if (previewFrameRef.current !== null) return;
				previewFrameRef.current = requestAnimationFrame(() => {
					previewFrameRef.current = null;
					previewOfficialRangePreference(preferences, settingKey, pendingPreviewRef.current);
				});
			};
			const updateDraft = (event) => {
				const next = Number(event.currentTarget.value);
				draftRef.current = next;
				setDraft(next);
				preview(next);
			};
			const commit = () => {
				interactingRef.current = false;
				const next = draftRef.current;
				if (previewFrameRef.current !== null) {
					cancelAnimationFrame(previewFrameRef.current);
					previewFrameRef.current = null;
					previewOfficialRangePreference(preferences, settingKey, next);
				}
				if (next === persistedRef.current) return;
				persistedRef.current = next;
				setPreference(settingKey, next);
			};
			const reset = () => {
				const next = DEFAULT_PREFERENCES[settingKey];
				draftRef.current = next;
				persistedRef.current = next;
				setDraft(next);
				previewOfficialRangePreference(preferences, settingKey, next);
				setPreference(settingKey, next);
			};
			const overridden = draft !== DEFAULT_PREFERENCES[settingKey];
			return jsxs("div", { className: "dsh-navx-setting", children: [jsxs("div", { className: "dsh-navx-settingHead", children: [jsx("label", { className: "dsh-navx-settingLabel", htmlFor: inputId, children: label }), jsxs("span", { className: "dsh-navx-settingBadges", children: [overridden ? jsx("span", { className: "dsh-navx-settingBadge", children: t("settings.overridden") }) : null, overridden ? jsx("button", { type: "button", className: "dsh-navx-settingReset", onClick: reset, children: t("settings.reset") }) : null, jsx("output", { className: "dsh-navx-settingValue", htmlFor: inputId, children: `${String(draft)}${unit}` })] })] }), jsx("input", { id: inputId, name: settingKey, className: "dsh-navx-settingRange", type: "range", min, max, step: 1, value: draft, "aria-valuetext": `${String(draft)}${unit}`, onPointerDown: () => interactingRef.current = true, onPointerUp: commit, onPointerCancel: commit, onKeyDown: () => interactingRef.current = true, onKeyUp: commit, onBlur: commit, onInput: updateDraft }), jsx("p", { className: "dsh-navx-settingHint", children: hint })] });
		}

		function NavigationSettings({ preferences, setPreference, t }) {
			const value = usePreferences(preferences);
			const [open, setOpen] = useState(false);
			const title = t("settings.title");
			return jsxs("li", { className: "dsh-navx-settingsCard", "data-open": open, children: [jsxs("button", { type: "button", className: "dsh-navx-settingsHeader", "aria-expanded": open, "aria-label": `${t(open ? "settings.collapse" : "settings.expand")}: ${title}`, onClick: () => setOpen((current) => !current), children: [jsxs("span", { className: "dsh-navx-settingsHeadText", children: [jsx("span", { className: "dsh-navx-settingsName", children: title }), jsx("span", { className: "dsh-navx-settingsDescription", children: t("settings.description") })] }), jsx(ChevronGlyph, { className: "dsh-navx-settingsChevron" })] }), open ? jsxs("div", { className: "dsh-navx-settingsBody", children: [jsxs("div", { className: "dsh-navx-setting", children: [jsx(SettingSwitch, { label: t("settings.enabled"), checked: value.enabled, onChange: (next) => setPreference("enabled", next) }), jsx("p", { className: "dsh-navx-settingHint", children: t("settings.enabledHint") })] }), jsxs("div", { className: "dsh-navx-setting", children: [jsx(SettingSwitch, { label: t("settings.showOnRight"), checked: value.side === "right", onChange: (next) => setPreference("side", next ? "right" : "left") }), jsx("p", { className: "dsh-navx-settingHint", children: t("settings.showOnRightHint") })] }), jsx(RangeSetting, { settingKey: "leftOffset", label: t("settings.leftOffset"), hint: t("settings.leftOffsetHint"), value: value.leftOffset, min: 0, max: 120, unit: "px", preferences: value, setPreference, t }), jsx(RangeSetting, { settingKey: "centerOffset", label: t("settings.centerOffset"), hint: t("settings.centerOffsetHint"), value: value.centerOffset, min: -200, max: 200, unit: "px", preferences: value, setPreference, t }), jsx(RangeSetting, { settingKey: "markerSpacing", label: t("settings.markerSpacing"), hint: t("settings.markerSpacingHint"), value: value.markerSpacing, min: 6, max: 40, unit: "px", preferences: value, setPreference, t }), jsx(RangeSetting, { settingKey: "recentTurns", label: t("settings.recentTurns"), hint: t("settings.recentTurnsHint"), value: value.recentTurns, min: 5, max: 50, unit: t("settings.turnUnit"), preferences: value, setPreference, t })] }) : null] });
		}

		function formatError(error) {
			return error instanceof Error ? error.message : String(error);
		}

		function logFailure(ctx, scope, error) {
			try {
				ctx.logger.error(`dsh-codex-timeline: ${scope} disabled after startup failure: ${formatError(error)}`);
			} catch {}
		}

		function safeSlot(ctx, name, register) {
			try {
				return ctx.slots.inject(name, () => {
					try {
						return register();
					} catch (error) {
						logFailure(ctx, `${name} contribution`, error);
						return () => {};
					}
				});
			} catch (error) {
				logFailure(ctx, `${name} injection`, error);
				return () => {};
			}
		}

		const inject = ["slots", "sessions", "locale"];

		function apply(ctx) {
			ensureStyles();
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "codex-navigation-enhancer: dictionaries");
			const preferences = new NavigationPreferences();
			ctx.effect(() => () => preferences.dispose(), "codex-navigation-enhancer: preferences");
			safeSlot(ctx, "settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: "dsh-codex-timeline",
				id: "codex-navigation-enhancer-settings",
				order: 30,
				locale: NS,
				inject: () => ({ preferences, setPreference: (key, value) => preferences.set(key, value) })
			}, NavigationSettings));
			safeSlot(ctx, "conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "codex-navigation-enhancer",
				order: 40,
				locale: NS,
				inject: (sessionId) => ({
					preferences,
					setPreference: (key, value) => preferences.set(key, value),
					loadThrough: (seq) => ctx.sessions.binding(sessionId)?.session.loadThrough(seq) ?? Promise.resolve(),
					forkAt: async (seq) => {
						const childId = await ctx.sessions.fork({ sessionId, atSeq: seq, increaseTitle: true });
						ctx.sessions.open(childId);
					}
				})
			}, NavigationAction));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
