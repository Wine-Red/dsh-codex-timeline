# DSH Codex Timeline

[English](README.en.md) | 中文

[![CI](https://github.com/Wine-Red/dsh-codex-timeline/actions/workflows/ci.yml/badge.svg)](https://github.com/Wine-Red/dsh-codex-timeline/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-codex-timeline.svg)](https://www.npmjs.com/package/dsh-codex-timeline)
[![license](https://img.shields.io/github/license/Wine-Red/dsh-codex-timeline.svg)](LICENSE)

DSH Codex Timeline 是 DeepSeek Harness Web 官方轮次导航栏的增强插件。DSH 从 `0.1.2` 系列开始提供原生轮次导航栏；自本插件 `0.6.0` 起，插件不再渲染第二套时间线，也不复制官方 Conversation 或 `TurnNavigator`，Codex 风格短横、基础状态和原生交互均由 DSH 自身负责。

插件只补充官方导航目前没有的能力：完整会话搜索、收藏、从指定轮次分支、包含时间与 Token 消耗的轮次预览，以及原有的个性化布局选项。

> [!IMPORTANT]
> 当前 `0.6.x` 只支持 DSH `0.1.2-alpha.3`。此前版本的 DSH 请使用插件 `0.5.5`。

## 功能

- 增强 DSH 原生轮次导航，提供阶梯波浪和高亮动效。
- 收藏常用轮次，并可在导航栏中只查看收藏内容。
- 搜索完整会话，快速定位并跳转到目标轮次。
- 查看轮次内容、时间和 Token 信息预览。
- 从已完成的轮次创建新分支。
- 自定义导航栏左右位置、边距、纵向偏移、标记间距和显示数量。

## 效果预览

### 常态

<table>
  <thead><tr><th>浅色主题</th><th>深色主题</th></tr></thead>
  <tbody><tr>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-default-dsh.png" width="470" alt="浅色主题下的时间线常态" /></td>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-default-dsh-dark.png" width="470" alt="深色主题下的时间线常态" /></td>
  </tr></tbody>
</table>

### 悬停与轮次预览

<table>
  <thead><tr><th>浅色主题</th><th>深色主题</th></tr></thead>
  <tbody><tr>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-hover-dsh.png" width="470" alt="浅色主题下的阶梯波浪和轮次预览" /></td>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-hover-dsh-dark.png" width="470" alt="深色主题下的阶梯波浪和轮次预览" /></td>
  </tr></tbody>
</table>

## 兼容性

DSH 从 `0.1.2` 系列开始内置原生轮次导航栏。本插件自 `0.6.0` 起改为增强该原生导航栏，只补充搜索、收藏、分支、预览、阶梯波浪和个性化布局，不再创建独立时间线。

- DSH `0.1.2-alpha.3`：使用当前插件 `0.6.x`。
- 此前版本的 DSH：使用旧版插件 `0.5.5`，由该版本提供完整的独立时间线。

旧版插件可以通过 npm 指定版本安装：

```powershell
dsh plugin --profile web add "dsh-codex-timeline@0.5.5"
```

也可以下载 [`v0.5.5` 源码包](https://github.com/Wine-Red/dsh-codex-timeline/archive/refs/tags/v0.5.5.zip)。当前主分支的 `install.ps1` 仅用于 DSH `0.1.2-alpha.3`，不要用它安装旧版插件。

## 安装

以下步骤只适用于 DSH `0.1.2-alpha.3`。旧版 DSH 请按上方兼容表安装指定的旧版插件。

先确认本机版本：

```powershell
dsh --version
```

安装 npm 发布包：

```powershell
.\install.ps1 -Profile web -Source dsh-codex-timeline
```

本地开发时可以直接链接当前目录：

```powershell
.\install.ps1 -Profile web -Source "E:\Program\DSH_plugin\dsh-codex-timeline"
```

安装后重启 DSH Web 并刷新浏览器。设置位于“设置 → 插件 → 插件配置 → 官方轮次导航增强”。

## 隐私

完整历史搜索通过同源 Host 路由 `/codex-timeline/search` 读取当前会话记录，只返回轮次摘要、有限上下文和本地日志已有的时间/Token 指标。搜索内容、收藏与交互状态不会发送给模型、遥测服务或第三方。

## 开发与验证

```powershell
pnpm install
pnpm run check
pnpm pack --pack-destination artifacts
```

`scripts/verify-dist.mjs` 会阻止旧 Conversation 副本、自建导航座位、Portal、私有运行时依赖或本机路径重新进入发布包，并验证 alpha.3 的插槽、会话 API、设置和分支锚点契约。

## License

[MIT](LICENSE)。当前版本不再分发官方 Conversation 或 `TurnNavigator` 实现；互操作与归属说明见 [NOTICE](NOTICE)。
