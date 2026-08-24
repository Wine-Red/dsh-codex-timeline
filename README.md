# DSH Codex Timeline

[English](README.en.md) | 中文

<p align="center">
  <img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/v0.2.0/docs/images/cover.png" width="960" alt="DSH Codex Timeline 封面：对话左侧的轮次轨道、预览和搜索" />
</p>

[![CI](https://github.com/Wine-Red/dsh-codex-timeline/actions/workflows/ci.yml/badge.svg)](https://github.com/Wine-Red/dsh-codex-timeline/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-codex-timeline.svg)](https://www.npmjs.com/package/dsh-codex-timeline)
[![license](https://img.shields.io/github/license/Wine-Red/dsh-codex-timeline.svg)](LICENSE)

为 DeepSeek Harness Web 长会话提供一个低干扰的用户 Turn 导航轨道。它默认贴在 Chat 正文左侧，也可在设置中镜像到右侧；它只标记用户发起的轮次，能随正文滚动高亮、快速跳转，并浏览完整历史轮次与预览。

## 界面预览

轨道默认保持安静：每个已加载的用户 Turn 对应一条短横，只有当前阅读位置高亮。鼠标移入后，附近标记以阶梯状展开，便于准确选择；移出后立即恢复紧凑状态。

<p align="center">
  <img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/v0.2.0/docs/images/feature-preview.zh.svg" width="960" alt="使用测试文案展示轮次预览和本地搜索" />
</p>

> 功能示意图与下方 DSH 实机截图中的提问、回答、指标和搜索结果均为专用测试文案，不包含真实会话内容。

下方两图截取自安装本插件的 DSH `0.1.0-rc.6`，展示同一条真实轨道在默认和鼠标悬停时的状态：

<table>
  <tr>
    <th>默认状态</th>
    <th>悬停展开</th>
  </tr>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/v0.2.0/docs/images/timeline-default-dsh.png" width="460" alt="DSH 实机中的默认短横轮次轨道" /></td>
    <td align="center"><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/v0.2.0/docs/images/timeline-hover-dsh.png" width="460" alt="DSH 实机中悬停展开并显示测试预览的轮次轨道" /></td>
  </tr>
  <tr>
    <td>低对比度，不占用正文宽度</td>
    <td>高亮跟随指针，离开后恢复当前 Turn</td>
  </tr>
</table>

功能图中的预览卡片对应实际交互：悬停可查看轮次、状态、耗时、首 token 时间、速度、提问与模型回答；搜索入口会直接展示关键词及其前后文，并可跳转到对应 Turn。

### 使用路径

1. 滚动正文，轨道自动指示当前 Turn。
2. 悬停查看两行提问与两行回答，点击或按 Enter / Space 跳转。
3. 轨道默认列出最近 N 轮（默认 25，可在设置 → 插件 → 插件配置中调整），并可切换到右侧；将鼠标移入轨道会在可滚方向的边缘外看到最多两条分级索引，它们同样支持悬停预览、点击跳转和邻近波动。滚轮每格移动一轮，并以短距离位移动画呈现方向，轨道位置和完整显示条数始终不变。

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

- 只为真实用户 Turn 建立标记；工具调用、计划确认、追问 UI、子代理和流式 assistant chunk 不增加噪声标记。
- 当前项随 viewport 更新；用户向上阅读时，流式内容不会强制拉回底部。
- 鼠标悬停时标记以短横阶梯展开并临时高亮；离开后恢复正文当前 Turn。
- 浮层显示“第 x / y 条”、时间、状态、两行用户提问、两行模型回答，以及数据可得时的本轮用时、首 token 延迟和 tok/s。
- 点击、Enter 或 Space 跳转；已在附近的目标使用短距离平滑滚动，远距离或补页后的目标会先快速抵达前方最多 88px，再用 180ms ease-out 完成收尾，避免跨几十屏“飞过”正文，也避免毫无方向感的硬切。减少动态效果模式仍会直接精准落点。到位后会校验并微调位置，再用 800ms 主题色描边确认目标；用户滚轮、触摸或指针操作会立即接管并取消旧跳转。方向键每次移动一轮，Page Up / Page Down 移动一屏，Home / End 到达首尾；支持 `focus-visible` 与 `prefers-reduced-motion`。
- 点击未加载索引或完整会话搜索结果时，会自动复用 DSH 正式分页流程加载更早历史；每次 prepend 前保存首个可见消息的稳定锚点及像素偏移，加载期间若用户继续阅读会同步更新，DOM 提交后在 layout 阶段恢复，因此正文不会抖动或漂移。桌面轨道不再重复提供手动补页按钮。
- 桌面轨道以固定窗口显示会话索引（默认最近 25 轮，可在设置中调整 5–50；无需加载正文）：悬停或键盘聚焦轨道时，每个可滚方向在窗口外显示最多两条完整索引，以长度、粗细和透明度形成由近及远的层级。这些边缘索引不是装饰：它们拥有与主索引相同的预览、点击、Enter / Space 和方向键能力，激活时以 39 / 30 / 21 / 15px 阶梯波动自然连接到主索引；未激活时仍保持原来的 7px / 5px 两级淡化静态样式。鼠标滚轮每格精确移动一轮，窗口与边缘索引沿方向平移一个间距；快速连续滚动会缩短过渡并从当前中间帧平滑转向新位置，避免停顿或动画排队，触控板小幅滚动则会先累积。轨道的绝对位置与完整标记数量均不改变，减少动态效果模式会关闭位移和宽度动画。到达首尾后滚动会自然交还正文，Ctrl/Command + 滚轮缩放和横向手势不会被拦截。未加载轮次由宿主 `lite=1` 全量索引提供，悬停同样显示两行摘要；点击会单路链式加载官方历史分页，超过 300ms 才显示轻量页数进度，定位完成或确认无进展后立即停止。
- 轨道默认位于左侧；开启“显示在右侧”后，桌面轨道、阶梯标记、预览卡片、搜索面板和窄屏入口会完整镜像。所有浮层都朝正文内侧展开，右缘会避开 DSH 滚动条与原生详情栏拖拽边界，不覆盖右侧宿主面板。
- 搜索按钮在浏览器本地检索已加载正文，同时通过宿主 `/codex-timeline/search` 路由检索完整持久化会话日志，合并展示并高亮关键词上下文；未加载的命中复用同一套带锚点保护、可取消、可验证的分页跳转。部署未挂载 `sessionQuery` 服务时自动退回仅已加载内容搜索。
- 即使只有一两条用户消息也始终显示时间线（仅在没有任何已加载消息且无更早历史时隐藏），便于从小会话开始即使用导航与搜索。
- 窄屏使用折叠入口，不遮挡消息、输入框或正文宽度。
- 设置页（设置 → 插件 → 插件配置）提供启用、显示在右侧两个开关和四个滑块（距边缘距离、向中部偏移、标记间距、显示轮次数量）；所有偏好即时写入 DSH settings（settings.yaml），刷新、换浏览器均保持。
- 折叠入口与搜索控件固定在所选一侧；距边缘滑块只把标记列向正文内侧移动，不改变控件位置。

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
dsh plugin --profile web add ".\artifacts\dsh-codex-timeline-0.2.0.tgz"
dsh --profile web --dump-config
```

`lib/client.js` 是为 rc.6 生成并锁定 SHA-256 的 compatibility artifact；`scripts/prepare-dist.mjs` 只做包名与构建路径标准化，`scripts/verify-dist.mjs` 检查其 slot、observer、交互与哈希契约。`src/navigation-model.mjs` 保留可独立测试的 Turn 投影与搜索逻辑。上游衍生代码的许可见 [NOTICE](NOTICE)。

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

[MIT](LICENSE)。本包含有基于 DeepSeek Harness MIT 源码构建的 rc.6 compatibility adapter，详见 [NOTICE](NOTICE)。
