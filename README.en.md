# dsh-recycle-bin

> **Recycle Bin for DeepSeek Harness**
> A standalone DSH recycle bin plugin: move archived conversations into a recoverable trash, batch restore or permanently purge, plus sidebar batch archive.

This plugin adds a recycle-bin workflow to DSH through official UI slots and its own namespaced HTTP routes. It does not modify DSH core or any existing plugin source; uninstalling restores the original UI.

---

## Features

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

## Install

> ⚠️ This plugin is still in testing. Please validate it in an isolated sandbox, simulation environment, or a DSH test instance before deploying to production or publishing.

### Install from local source

```sh
dsh plugin --profile web add /path/to/dsh-recycle-bin
```

Restart DSH Web after installation.

### Install from Git (after publishing)

```sh
dsh plugin --profile web add github:<your-username>/dsh-recycle-bin
```

### Uninstall

```sh
dsh plugin --profile web remove dsh-recycle-bin
```

After uninstall and restart, the recycle-bin entry and sidebar batch-archive enhancement are removed.

---

## Usage

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

## Security & Privacy

- The plugin works locally inside DSH only; it does not collect or upload conversation content or personal data
- No telemetry, analytics, ads, or third-party requests
- Trash state is stored locally only:
  - `<DSH_HOME or ~/.dsh>/cache/dsh-recycle-bin/state.json`
- “Move to trash / restore” is logical state management and does not modify local conversation files
- “Delete forever” requires confirmation, then removes the local session files and cleans DSH metadata
- Host routes are namespaced under `/dsh-recycle-bin/*` and do not conflict with other plugins
- Do not expose DSH Web to untrusted networks or the public internet; if exposure is required, add authentication at a reverse proxy layer

---

## How it works

| Part | File | Mechanism |
|---|---|---|
| Host routes | `lib/index.js` | Registers `/dsh-recycle-bin/*` routes; manages trash state, unarchive, restore, and permanent purge |
| Browser UI | `lib/client.js` | Registers the sidebar footer action and recycle-bin panel; adds sidebar batch-archive DOM enhancement |

`cordis.patch.yml` is the bundle patch layer: it inserts the `dsh-recycle-bin` row when the bundle is listed in the profile.

---

## Data storage

- Trash index: `<DSH_HOME or ~/.dsh>/cache/dsh-recycle-bin/state.json`
- The file only contains trash metadata such as `sessionId`, `trashedAt`, and `deletedAt`; it does not contain conversation content
- Removing this file only loses the recycle-bin view; it does not delete DSH session files
- Permanent deletion removes local session files after user confirmation and is irreversible

---

## Known limitations

- The sidebar batch-archive checkboxes are a DOM enhancement and may need adjustment when DSH UI class names change
- While the recycle-bin panel is open, sidebar batch selection is disabled to avoid conflicting batch modes
- Permanent deletion keeps a local tombstone so deleted conversations do not reappear before a UI refresh

---

## Development

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

Run tests:

```sh
npm test
```

---

## License

MIT

---

## About this plugin's “birth certificate”

This plugin is also a **human-AI hybrid**: humans set the requirements and direction, while the code's “hands” (really tokens) mostly belong to the model.

Treat it as a **reference implementation**—like a recipe: follow it if you like, but don't expect a non-stick pan:

- **Read it before using it**: skim the code, run the tests, and adapt it to your own scenario;
- The code is provided **AS-IS**, with no warranty card and no extended service plan;
- If something breaks, it's probably the AI's fault—issues and PRs are welcome to help it “retake the class”;
- Feel free to **fork, modify, and distribute**, and share improvements—shared joy is double joy.

**In plain words**: if the trash bin empties, lucky you; if you can restore something by accident, even better. Fill the pits together and come back to share when you make it better 😄
