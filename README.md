# dsh-recycle-bin

> **Recycle Bin for DeepSeek Harness**
> 为 DSH 增加独立回收站：归档对话可移入回收站、批量还原、彻底删除，并支持左侧栏批量归档。
>
> A standalone DSH recycle bin plugin: move archived conversations into a recoverable trash, batch restore or permanently purge, plus sidebar batch archive.

为 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 提供独立的回收站管理能力。插件通过 DSH 官方 UI 插槽与独立 HTTP 路由工作，不修改 DSH 核心代码，也不修改其它插件源码；卸载后原界面可恢复。

This plugin adds a recycle-bin workflow to DSH through official UI slots and its own namespaced HTTP routes. It does not modify DSH core or any existing plugin source; uninstalling restores the original UI.

---

## 功能 / Features

### 中文

- **回收站入口**
  - 左侧栏左下角、设置图标上方新增“回收站”入口
- **归档管理**
  - 归档列表支持单个/批量/按工作区操作
  - 可“还原”到原工作区/文件夹
  - 可“移入回收站”
- **回收站管理**
  - 支持批量“还原”
  - 支持批量“彻底删除”
- **安全确认**
  - 移入回收站与彻底删除均有二次确认
  - 运行中的对话会红色高亮，并在确认弹窗中明确提示
- **左侧栏批量归档**
  - 对话左侧提供隐形勾选框，鼠标移动到左侧区域时亮起
  - 勾选后可批量归档
  - 已勾选时，三个点菜单会变为“批量归档”
- **跨平台**
  - 使用 Node.js `path` / `os` / `fs`，兼容 Windows、Linux、macOS

### English

- **Recycle bin entry**
  - Sidebar footer entry above Settings
- **Archive management**
  - Single, batch, and workspace-level operations in the archive list
  - Restore to the original workspace/folder
  - Move to trash
- **Trash management**
  - Batch restore
  - Batch permanent delete
- **Safety**
  - Confirmations before moving to trash and before permanent deletion
  - Running conversations are highlighted in red and clearly warned in the dialog
- **Sidebar batch archive**
  - Invisible checkboxes on the left of conversation rows; they appear on hover
  - Batch archive after selection
  - The row overflow menu becomes “batch archive” while selections exist
- **Cross-platform**
  - Uses Node.js `path` / `os` / `fs`; supports Windows, Linux, and macOS

---

## 安装 / Install

> ⚠️ 当前插件仍在测试阶段。请先在隔离沙盒、模拟环境或 DSH 测试实例中完整验证，再部署到生产环境或公开发布。
>
> ⚠️ This plugin is still in testing. Please validate it in an isolated sandbox, simulation environment, or a DSH test instance before deploying to production or publishing.

### 从本地源码安装 / Install from local source

```sh
dsh plugin --profile web add /path/to/dsh-recycle-bin
```

安装后重启 DSH Web 生效。  
Restart DSH Web after installation.

### 从 Git 仓库安装（发布后）/ Install from Git (after publishing)

```sh
dsh plugin --profile web add github:<your-username>/dsh-recycle-bin
```

### 卸载 / Uninstall

```sh
dsh plugin --profile web remove dsh-recycle-bin
```

卸载并重启后，回收站入口和批量归档增强会移除。  
After uninstall and restart, the recycle-bin entry and sidebar batch-archive enhancement are removed.

---

## 使用 / Usage

### 中文

1. 重启 DSH 后打开 WebUI
2. 点击左侧栏左下角的“回收站”
3. 在“归档”页：
   - 鼠标悬停单条对话可单独“还原”或“移入回收站”
   - 点击“批量操作”可多选或按工作区勾选后批量操作
4. 在“回收站”页：
   - 可单条/批量“还原”
   - 可单条/批量“彻底删除”
5. 左侧栏批量归档：
   - 鼠标移动到对话左侧空白处，隐形勾选框亮起
   - 勾选多个对话后，点击浮动“批量归档”或三个点菜单中的“批量归档”

### English

1. Restart DSH and open the WebUI
2. Click “Trash” at the bottom-left of the sidebar
3. In “Archived”:
   - Hover a row for single “Restore” or “Move to trash”
   - Use “Batch” to select multiple items or whole workspaces
4. In “Trash”:
   - Restore items individually or in batch
   - Delete items forever individually or in batch
5. Sidebar batch archive:
   - Hover the blank left area of a conversation to reveal its checkbox
   - Select multiple rows, then use the floating “Archive selected” button or the overflow menu

---

## 安全与隐私 / Security & Privacy

### 中文

- 插件仅在本机 DSH 内工作，不收集、不上传任何对话内容或个人信息
- 不包含遥测、统计、广告或第三方请求
- 回收站状态只保存在本机：
  - `<DSH_HOME 或 ~/.dsh>/cache/dsh-recycle-bin/state.json`
- “移入回收站 / 还原”只做逻辑状态管理，不修改本地对话文件
- “彻底删除”会先二次确认，再删除对应的本地会话文件，并清理 DSH 元数据
- Host 路由固定为 `/dsh-recycle-bin/*`，不占用其它插件命名空间
- 请勿将 DSH Web 暴露到不可信网络或公网；若必须暴露，请在反向代理层增加鉴权

### English

- The plugin works locally inside DSH only; it does not collect or upload conversation content or personal data
- No telemetry, analytics, ads, or third-party requests
- Trash state is stored locally only:
  - `<DSH_HOME or ~/.dsh>/cache/dsh-recycle-bin/state.json`
- “Move to trash / restore” is logical state management and does not modify local conversation files
- “Delete forever” requires confirmation, then removes the local session files and cleans DSH metadata
- Host routes are namespaced under `/dsh-recycle-bin/*` and do not conflict with other plugins
- Do not expose DSH Web to untrusted networks or the public internet; if exposure is required, add authentication at a reverse proxy layer

---

## 原理 / How it works

| Part | File | Mechanism |
|---|---|---|
| Host routes | `lib/index.js` | Registers `/dsh-recycle-bin/*` routes; manages trash state, unarchive, restore, and permanent purge |
| Browser UI | `lib/client.js` | Registers the sidebar footer action and recycle-bin panel; adds sidebar batch-archive DOM enhancement |

`cordis.patch.yml` is the bundle patch layer: it inserts the `dsh-recycle-bin` row when the bundle is listed in the profile.

---

## 数据存储说明 / Data storage

- 回收站索引：`<DSH_HOME 或 ~/.dsh>/cache/dsh-recycle-bin/state.json`
- 该文件只包含回收站条目的 `sessionId`、`trashedAt`、`deletedAt` 等元数据，不包含对话正文
- 删除该文件只会丢失回收站视图，不会删除 DSH 会话文件
- 彻底删除操作会按用户确认删除本地会话文件，属于不可恢复操作

---

## 已知限制 / Known limitations

### 中文

- 左侧栏批量归档的隐形勾选框通过 DOM 增强实现，可能随 DSH UI 版本变化而需要适配
- 回收站面板打开时，左侧栏批量选择会暂时禁用，避免两个批量操作界面冲突
- 彻底删除后会在插件状态中保留 tombstone，避免已删除对话在刷新前重新出现

### English

- The sidebar batch-archive checkboxes are a DOM enhancement and may need adjustment when DSH UI class names change
- While the recycle-bin panel is open, sidebar batch selection is disabled to avoid conflicting batch modes
- Permanent deletion keeps a local tombstone so deleted conversations do not reappear before a UI refresh

---

## 开发 / Development

```
dsh-recycle-bin/
├── package.json
├── cordis.patch.yml
├── README.md
├── README.en.md
├── lib/
│   ├── index.js       # Host: HTTP routes + state + purge/unarchive logic
│   └── client.js      # Browser: sidebar entry + recycle-bin panel + batch archive
└── test/
    └── plugin.test.mjs # Automated tests
```

运行测试 / Run tests:

```sh
npm test
```

---

## License

MIT

---

## 关于本插件的“出生证明”

本插件同样是**人类与 AI 的混合双打**产物：需求是人类提的，方向是人类定的，代码的“手”（其实是 token）主要出自模型。

请把它当作一份**参考实现**来用——就像菜谱：照着做可以，但别指望不粘锅：

- **用之前自己先过目**：代码翻一翻、测试跑一跑、按你的场景调一调；
- 代码按 **“现状”（AS-IS）** 提供，没有保修卡，也没有延保服务；
- 要是翻车了，那大概率是 AI 的锅——欢迎提 issue 或 PR 帮它“补课”；
- 欢迎 **fork、修改、分发**，也欢迎提 issue 或 PR 一起改进——独乐乐不如众乐乐。

**说人话**：回收站能正常清空是缘，误删能救回来是福；踩坑了一起填，改好了记得回来分享 😄
