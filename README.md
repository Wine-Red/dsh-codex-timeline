# DSH Codex Timeline

[English](README.en.md) | 中文

<p align="center">
  <img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/cover.png" width="960" alt="DSH Codex Timeline 封面：对话左侧的轮次轨道、预览和搜索" />
</p>

[![CI](https://github.com/Wine-Red/dsh-codex-timeline/actions/workflows/ci.yml/badge.svg)](https://github.com/Wine-Red/dsh-codex-timeline/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-codex-timeline.svg)](https://www.npmjs.com/package/dsh-codex-timeline)
[![license](https://img.shields.io/github/license/Wine-Red/dsh-codex-timeline.svg)](LICENSE)

为 DeepSeek Harness Web 长会话提供一个低干扰的用户 Turn 导航轨道。它只标记真正改变会话方向的用户轮次，在正文旁提供完整历史索引、预览、搜索和可靠跳转；默认位于左侧，也可以完整镜像到右侧。

## 0.5.3 更新重点

- **加载提示移到会话区域左下角**：点击导航轨道后出现的补页进度提示不再挂在轨道控件下方，窄屏也不再使用顶部居中横幅；文案、300ms 延迟、页数、错误配色和读屏播报保持不变，轨道显示在右侧时同样停靠左下角。

## 0.5.2 更新重点

- **落点提示更轻、更自然**：定位成功后不再绘制高对比度外框，改为目标用户气泡进行一次短暂的主题色闪烁；浅色、深色与彩色主题均沿用 DSH 自身的语义颜色。
- **闪烁可单独关闭**：设置 → 插件 → 插件配置新增“跳转后闪烁提示”开关，默认开启；关闭后跳转、落点校验与读屏播报保持不变。
- **修复时间线不显示**：兼容 DSH `0.1.1-rc.2` 的空会话启动顺序，在正文首次就绪时补挂载时间线，同时避免历史补页重建轨道状态。
- **一次选择即可定位**：点击未加载轮次会自动连续补页、保护阅读锚点并校验最终落点，不再需要反复点击。
- **边缘索引也是真实入口**：窗口外的两级视觉指引支持悬停预览、点击、键盘操作和邻近波动，不再只是装饰。
- **动效有方向但不拖沓**：近距离平滑滚动，远距离快速抵达后用 180ms 收尾；滚轮连续操作可以从动画中途重新定向。
- **更干净、更可靠的浮层**：桌面端移除重复的手动补页省略号；预览卡始终位于正文、表格和 sticky 代码块之上。

## 界面预览

下面四图来自 DSH `0.1.1-rc.2` 与本插件 `0.5.0` 的真实浏览器界面，并分别使用 DSH 原生浅色、深色主题。截图浏览器中已移除 `dsh-any-background` 的壁纸层、主题注册和变量覆盖；为避免暴露本地会话，正文、预览、指标和搜索语义均替换为专用测试文案。

### 默认：完整但安静

未激活时，主索引与两级边缘指引保持低对比度静态短横；搜索和收藏固定在轨道顶部，不挤占正文宽度。

<table>
  <thead><tr><th>DSH 原生浅色</th><th>DSH 原生深色</th></tr></thead>
  <tbody><tr>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-default-dsh.png" width="470" alt="DSH 原生浅色主题中的 0.5.0 默认时间线：搜索、收藏和完整静态索引" /></td>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-default-dsh-dark.png" width="470" alt="DSH 原生深色主题中的 0.5.0 默认时间线：搜索、收藏和完整静态索引" /></td>
  </tr></tbody>
</table>

### 悬停：预览、波动与明确层级

选中标记扩展为 39px，邻近三条依次形成 30 / 21 / 15px 波动；预览显示轮次、状态、性能指标、两行提问与两行回答，并保持在代码块等正文表面之上。

<table>
  <thead><tr><th>DSH 原生浅色</th><th>DSH 原生深色</th></tr></thead>
  <tbody><tr>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-hover-dsh.png" width="470" alt="DSH 原生浅色主题中的 0.5.0 悬停时间线：分级波动和顶层预览卡" /></td>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-hover-dsh-dark.png" width="470" alt="DSH 原生深色主题中的 0.5.0 悬停时间线：分级波动和顶层预览卡" /></td>
  </tr></tbody>
</table>

### 使用路径

1. 滚动正文，轨道自动指示当前 Turn。
2. 悬停查看两行提问与两行回答，点击或按 Enter / Space 跳转。
3. 对未加载的轮次直接点击一次；插件会自动补齐所需历史、恢复阅读锚点并完成定位。
4. 在轨道上滚轮每格移动一轮；到达首尾后，滚动会自然交还正文。
5. 需要时使用搜索、收藏、键盘导航，或在设置中调整显示轮数与左右位置。

## 兼容性

截至当前版本（`0.1.1-rc.2`）兼容；请勿在其他 DSH 版本上强行安装，升级 DSH 前先卸载本插件。Node.js `^22.19.0 || >=24.0.0`。

## 安装

确认当前版本：

```powershell
dsh --version
```

从 npm 安装到 Web profile：

```powershell
dsh plugin --profile web add dsh-codex-timeline
```

也可以使用仓库内的版本检查脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

安装后重启 DSH Web 进程并刷新页面。可用以下命令确认 bundle 已生效：

```powershell
dsh --profile web --dump-config | Select-String -Pattern "dsh-codex-timeline|ui-conversation"
```

输出应包含 `# == dsh-codex-timeline`；内置 `ui-conversation` 行应为 `disabled: true`，并新增 `codex-timeline` 行，其 `name` 为 `dsh-codex-timeline`。

### 从旧的本地覆盖版迁移

如果曾安装过早期同名 Conversation tarball，先删除它，再安装标准 bundle：

```powershell
dsh plugin --profile web remove "@deepseek-ai/dsh-client-ui-conversation"
dsh plugin --profile web add dsh-codex-timeline
```

## 卸载

```powershell
dsh plugin --profile web remove dsh-codex-timeline
```

或运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
```

重启后，DSH 会恢复使用自带的 Conversation UI。

## 功能

### 完整会话索引

- 只为真实用户 Turn 建立标记；工具调用、计划确认、追问 UI、子代理和流式 assistant chunk 不增加噪声。
- 宿主 `lite=1` 索引覆盖完整持久化会话，不再截断 500 轮；正文仍只按需加载。
- 桌面轨道显示固定窗口（默认最近 25 轮，可调 5–50），每个可滚方向额外保留两级完整边缘指引。
- 主索引与边缘指引都支持预览、点击、Enter / Space 和方向键；未激活时保持 7px / 5px 的低干扰静态样式。
- 鼠标滚轮每格精确移动一轮；连续滚动会从当前动画中间帧重新定向，触控板小幅输入会先累积，到达边界后把滚动交还正文。

### 可靠跳转

- 已加载且距离较近的目标使用短距离平滑滚动；远距离目标先快速抵达前方最多 88px，再以 180ms ease-out 收尾。
- 未加载索引和完整会话搜索结果共用 DSH 正式分页流程；整个过程单路执行，超过 300ms 才在会话区域左下角显示轻量页数进度。
- 每次 prepend 前记录首个可见语义行和像素偏移；加载期间如果继续阅读，锚点会随用户更新，DOM 提交后再恢复。
- 到位后校验并微调到 2px 内，以 800ms 主题色描边确认目标；滚轮、触摸或新选择会立即取消旧跳转。
- 分页以 Chat 顺序、首节点和已注册 DOM 锚点共同判断进展，避免宿主投影 Map 不增长时误判停滞。

### 预览、搜索与收藏

- 预览卡显示“第 x / y 条”、时间、状态、两行提问、两行回答，以及可用时的本轮用时、首 token 延迟和 tok/s。
- 预览卡和其中的分支、收藏操作保持在正文 sticky 表面之上，不会再被代码块标题遮挡。
- 搜索同时覆盖已加载正文与完整持久化会话日志，合并并高亮关键词上下文；未加载命中也能一次选择直达。
- 部署未挂载 `sessionQuery` 服务时自动退回仅搜索已加载内容，不影响时间线导航。

### 布局、键盘与设置

- 当前项随 viewport 更新；用户向上阅读时，流式内容不会强制拉回底部。即使只有一两条用户消息也会显示时间线。
- 方向键移动一轮，Page Up / Page Down 移动一屏，Home / End 到达首尾；支持 `focus-visible` 和 `prefers-reduced-motion`。
- 开启“显示在右侧”后，轨道、边缘指引、预览、搜索面板和窄屏入口完整镜像，并避开滚动条与详情栏拖拽边界。
- 窄屏使用折叠入口；桌面端不再显示重复的手动补页省略号，点击未加载索引时自动补页。
- 设置页提供启用、跳转后闪烁提示、显示在右侧，以及距边缘距离、向中部偏移、标记间距、显示轮次数量；偏好即时写入 `settings.yaml`。

## 隐私

摘要、回答预览、hover/focus 状态都只在当前浏览器中从正式 Chat snapshot 计算。全量搜索通过同源宿主路由 `/codex-timeline/search` 读取持久化会话日志（仅按关键词返回匹配轮次的摘要与上下文窗口），不会发给模型、不会写入遥测，也不会将内容发送到任何第三方。

## 开发与验证

```powershell
pnpm install
pnpm run check
pnpm pack --pack-destination artifacts
```

安装本地 tarball做 profile 契约验证：

```powershell
dsh plugin --profile web add ".\artifacts\dsh-codex-timeline-0.5.3.tgz"
dsh --profile web --dump-config
```

`lib/client.js` 是为 DSH `0.1.1-rc.2` 生成并锁定 SHA-256 的 compatibility artifact；`scripts/prepare-dist.mjs` 只做包名与构建路径标准化，`scripts/verify-dist.mjs` 检查其 slot、observer、交互与哈希契约。`src/navigation-model.mjs` 保留可独立测试的 Turn 投影、轨道窗口、跳转策略与搜索逻辑。上游衍生代码的许可见 [NOTICE](NOTICE)。

## 升级检查

DSH 升级时不要直接放宽 peer dependency。至少执行：

```powershell
dsh --version
dsh --profile web --dump-config
pnpm run check
pnpm pack --pack-destination artifacts
pnpm run test
```

并重新核对：

1. `ui-conversation` 配置行和 client module loader 规则；
2. `ConversationTimelineSnapshot`、Chat snapshot、Turn location 与稳定节点 ID；
3. Chat scroll owner、分页 prepend、bottom-follow 和 navigation slot；
4. settings namespace/scope、locale 和 slot 注入契约；
5. 暗色/亮色、窄屏、键盘、reduced motion、流式回复、工具密集 Turn、断线恢复和历史加载的真实浏览器行为。

能力不再兼容时，应发布新的独立 adapter 版本；不要让旧版本覆盖未知的 Conversation 实现。

## 许可证

[MIT](LICENSE)。本包包含基于 DeepSeek Harness MIT 源码构建的 `0.1.1-rc.2` compatibility adapter，详见 [NOTICE](NOTICE)。
