window.__ModuleLoader__.load({
	id: "dsh-recycle-bin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const react = require("react");
		const ReactDOM = require("react-dom");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		const {
			Modal,
			Button,
			Tooltip,
			IconTrashOutline16,
			IconArchiveOutline20,
			IconWarningOutline16,
			IconCloseOutline16,
			IconRefreshOutline14,
		} = primitives;

		const h = react.createElement;
		const Fragment = react.Fragment;
		const { useState, useEffect, useMemo, useCallback, useRef, useSyncExternalStore } = react;

		// ---------- styles ----------
		const CSS = `
.drb-entry {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  box-sizing: border-box;
  width: calc(100% + 8px);
  height: 34px;
  margin: 4px -4px;
  padding: 6px 2px 6px 10px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  white-space: nowrap;
  overflow: hidden;
}
.drb-entry:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.drb-entry-rail {
  width: 36px;
  height: 36px;
  margin: 8px 0 10px;
  padding: 0;
  justify-content: center;
  border-radius: 50%;
}
.drb-entry-label { overflow: hidden; text-overflow: ellipsis; }
.drb-sidebar-check {
  box-sizing: border-box;
  position: absolute;
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  margin: 0;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 4px;
  background: var(--dsw-alias-bg-layer-1);
  cursor: pointer;
  opacity: 0;
  transition: opacity .12s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
  line-height: 1;
  z-index: 2;
}
.drb-sidebar-check:hover,
.drb-sidebar-check.drb-checked,
.drb-sidebar-check.drb-visible { opacity: 1; }
.drb-sidebar-check.drb-checked {
  background: var(--dsw-alias-brand-primary);
  border-color: var(--dsw-alias-brand-primary);
}
.drb-sidebar-check.drb-checked::after { content: "✓"; }
.drb-sidebar-row { position: relative; }
.drb-batch-bar {
  position: fixed;
  left: 12px;
  bottom: 132px;
  z-index: 1200;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-overlay);
  box-shadow: var(--dsw-shadow-lv2);
}
.drb-batch-menu {
  position: fixed;
  z-index: 1300;
  min-width: 180px;
  padding: 4px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-overlay);
  box-shadow: var(--dsw-shadow-lv3);
}
.drb-batch-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  border-radius: 6px;
  font-size: 13px;
  text-align: left;
}
.drb-batch-menu-item:hover { background: var(--dsw-alias-interactive-bg-hover); }
.drb-dialog.drb-dialog {
  width: min(680px, calc(100vw - 32px));
  height: min(560px, calc(100dvh - 32px));
  display: flex;
  flex-direction: column;
  padding: 0;
  gap: 0;
  position: relative;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.45;
}
.drb-dialog * { box-sizing: border-box; }
.drb-content { display: flex; flex-direction: column; min-height: 0; padding: 0; }
.drb-tabs {
  display: flex;
  gap: 4px;
  padding: 10px 12px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l3);
  flex: none;
}
.drb-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px 8px 0 0;
}
.drb-tab:hover { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.drb-tab-active { color: var(--dsw-alias-label-primary); border-bottom-color: var(--dsw-alias-brand-primary); }
.drb-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 600;
}
.drb-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 8px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  min-height: 44px;
  flex-wrap: wrap;
}
.drb-toolbar-spacer { flex: 1; }
.drb-selected-count { font-weight: 600; color: var(--dsw-alias-label-primary); }
.drb-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 10px 14px;
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);
}
.drb-group + .drb-group { margin-top: 10px; }
.drb-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .03em;
}
.drb-group-header input[type="checkbox"] { margin: 0; }
.drb-group-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drb-group-count { flex: none; }
.drb-group-rows {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  overflow: hidden;
  background: var(--dsw-alias-bg-layer-1);
}
.drb-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  min-height: 36px;
}
.drb-row:last-child { border-bottom: none; }
.drb-row:hover { background: var(--dsw-alias-bg-layer-2); }
.drb-row input[type="checkbox"] { margin: 0; flex: none; }
.drb-row-actions {
  display: none;
  align-items: center;
  gap: 4px;
  flex: none;
  margin-left: auto;
}
.drb-row:hover .drb-row-actions { display: inline-flex; }
.drb-row-action {
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
  line-height: 20px;
  border-radius: 6px;
}
.drb-row-action-danger { color: #e5484d !important; }
.drb-row-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 1px; }
.drb-row-title { font-size: 13px; font-weight: 500; color: var(--dsw-alias-label-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drb-row-meta { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.drb-running-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #e5484d;
  font-weight: 700;
}
.drb-row-running { background: rgba(229, 72, 77, .06); }
.drb-empty { padding: 40px 12px; text-align: center; color: var(--dsw-alias-label-tertiary); }
.drb-notice {
  margin: 10px 12px 0;
  padding: 7px 10px;
  border-radius: 8px;
  background: rgba(46, 160, 67, .12);
  color: var(--dsw-alias-label-primary);
}
.drb-error {
  margin: 10px 12px 0;
  padding: 7px 10px;
  border-radius: 8px;
  background: rgba(229, 72, 77, .12);
  color: #e5484d;
}
.drb-confirm-warning {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid rgba(229, 72, 77, .35);
  border-radius: 10px;
  background: rgba(229, 72, 77, .08);
  color: #e5484d;
  font-weight: 600;
  margin-bottom: 10px;
}
.drb-confirm-body { color: var(--dsw-alias-label-primary); }
.drb-running-list {
  margin: 6px 0 0 26px;
  color: #e5484d;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.drb-confirm-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, .35);
  border-radius: inherit;
  padding: 24px;
}
.drb-confirm-card {
  width: min(460px, 100%);
  background: var(--dsw-alias-bg-overlay);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, .25);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.drb-confirm-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}
.drb-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
.drb-danger { background: #e5484d !important; border-color: #e5484d !important; }
.drb-danger:hover { background: #d93036 !important; }
`;

		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=\"dsh-recycle-bin\"]") === null) {
			const style = document.createElement("style");
			style.dataset.pluginCss = "dsh-recycle-bin";
			style.textContent = CSS;
			document.head.appendChild(style);
		}

		// ---------- API ----------
		const ROUTE_PREFIX = "/dsh-recycle-bin";

		async function parseResponse(response) {
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				const error = new Error(data && data.error ? data.error : `HTTP ${response.status}`);
				error.data = data;
				throw error;
			}
			return data;
		}

		function post(path, body) {
			return fetch(`${ROUTE_PREFIX}${path}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			}).then(parseResponse);
		}

		const api = {
			list: () => fetch(`${ROUTE_PREFIX}/list`, { cache: "no-store" }).then(parseResponse),
			trash: (sessionIds) => post("/trash", { sessionIds }),
			unarchive: (sessionIds) => post("/unarchive", { sessionIds }),
			restore: (sessionIds) => post("/restore", { sessionIds }),
			purge: (sessionIds) => post("/purge", { sessionIds }),
		};

		function findMainTree() {
			const trees = document.querySelectorAll('div[role="tree"]');
			for (const tree of trees) {
				if (tree.querySelector('div[role="treeitem"][aria-selected]')) return tree;
			}
			return null;
		}

		// ---------- panel ----------
		function RecycleBinPanel({ open, onClose, t, getSessions, subscribeSessions, getWorkspaces, subscribeWorkspaces, refreshSessions, refreshWorkspaces }) {
			const sessions = useSyncExternalStore(subscribeSessions, getSessions);
			const workspaces = useSyncExternalStore(subscribeWorkspaces, getWorkspaces);
			const [trashItems, setTrashItems] = useState([]);
			const [deletedItems, setDeletedItems] = useState([]);
			const [tab, setTab] = useState("archive");
			const [selectionMode, setSelectionMode] = useState(false);
			const [selected, setSelected] = useState([]);
			const [confirm, setConfirm] = useState(null);
			const [busy, setBusy] = useState(false);
			const [notice, setNotice] = useState("");
			const [error, setError] = useState("");

			const load = () => {
				setBusy(true);
				setError("");
				api.list()
					.then((data) => {
						setTrashItems(data.items || []);
						setDeletedItems(data.deleted || []);
					})
					.catch((cause) => setError(cause.message))
					.finally(() => setBusy(false));
			};

			useEffect(() => {
				if (!open) return;
				load();
				// eslint-disable-next-line react-hooks/exhaustive-deps
			}, [open]);

			const byId = sessions.byId || {};
			const archivedIds = useMemo(() => new Set(workspaces.archivedSessionIds || []), [workspaces]);
			const trashSet = useMemo(() => new Set(trashItems.map((item) => item.sessionId)), [trashItems]);
			const deletedSet = useMemo(() => new Set(deletedItems.map((item) => item.sessionId)), [deletedItems]);
			const sessionWorkspace = useMemo(() => {
				const map = new Map();
				for (const workspace of workspaces.items || []) {
					for (const sessionId of workspace.sessionIds || []) {
						if (!map.has(sessionId)) map.set(sessionId, workspace.workspaceId);
					}
				}
				return map;
			}, [workspaces]);
			const workspaceById = useMemo(() => {
				const map = new Map();
				for (const workspace of workspaces.items || []) map.set(workspace.workspaceId, workspace);
				return map;
			}, [workspaces]);

			const archiveRows = useMemo(() => {
				const rows = [];
				for (const id of sessions.ids || []) {
					const session = byId[id];
					if (!session) continue;
					if (!archivedIds.has(id) || trashSet.has(id) || deletedSet.has(id)) continue;
					rows.push({ id, session, workspaceId: sessionWorkspace.get(id) });
				}
				return rows;
			}, [sessions, byId, archivedIds, trashSet, deletedSet, sessionWorkspace]);

			const trashRows = useMemo(() => trashItems.map((item) => ({
				id: item.sessionId,
				trashedAt: item.trashedAt,
				session: byId[item.sessionId],
				workspaceId: sessionWorkspace.get(item.sessionId),
			})), [trashItems, byId, sessionWorkspace]);

			const grouped = useMemo(() => {
				const source = tab === "archive" ? archiveRows : trashRows;
				const groups = new Map();
				for (const row of source) {
					const key = row.workspaceId || "";
					if (!groups.has(key)) groups.set(key, []);
					groups.get(key).push(row);
				}
				return [...groups.entries()].map(([key, rows]) => ({
					key,
					workspaceId: key || undefined,
					label: key ? (workspaceById.get(key)?.title || workspaceById.get(key)?.path || t("ungrouped")) : t("ungrouped"),
					rows,
				}));
			}, [tab, archiveRows, trashRows, workspaceById, t]);

			const selectedSet = useMemo(() => new Set(selected), [selected]);

			const toggleOne = (id) => {
				setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
			};

			const toggleGroup = (rows) => {
				const ids = rows.map((row) => row.id);
				const allSelected = ids.length > 0 && ids.every((id) => selectedSet.has(id));
				setSelected((prev) => {
					const next = new Set(prev);
					for (const id of ids) {
						if (allSelected) next.delete(id);
						else next.add(id);
					}
					return [...next];
				});
			};

			const clearSelection = () => {
				setSelected([]);
				setSelectionMode(false);
			};

			const closePanel = () => {
				clearSelection();
				setConfirm(null);
				setNotice("");
				setError("");
				onClose();
			};

			const switchTab = (next) => {
				clearSelection();
				setConfirm(null);
				setNotice("");
				setError("");
				setTab(next);
			};

			const requestConfirm = (kind) => {
				if (selected.length === 0) return;
				const runningIds = selected.filter((id) => {
					const session = byId[id];
					return session && session.running;
				});
				setConfirm({
					kind,
					ids: selected.slice(),
					runningCount: runningIds.length,
					runningNames: runningIds.map((id) => byId[id]?.displayTitle || id).slice(0, 5),
				});
			};

			const runAction = async (kind, ids) => {
				setBusy(true);
				setError("");
				setNotice("");
				try {
					let data;
					if (kind === "trash") data = await api.trash(ids);
					else if (kind === "unarchive") data = await api.unarchive(ids);
					else if (kind === "restore") data = await api.restore(ids);
					else if (kind === "purge") data = await api.purge(ids);
					if (data && Array.isArray(data.items)) {
						setTrashItems(data.items);
						setDeletedItems(data.deleted || []);
					}
					if (kind === "purge" && refreshSessions) {
						refreshSessions().catch(() => {});
					}
					if (kind === "unarchive" && refreshWorkspaces) {
						refreshWorkspaces().catch(() => {});
					}
					setNotice(kind === "trash" ? t("done.moved", { count: ids.length })
						: kind === "unarchive" ? t("done.unarchived", { count: ids.length })
						: kind === "restore" ? t("done.restored", { count: ids.length })
						: t("done.purged", { count: ids.length }));
					clearSelection();
				} catch (cause) {
					setError(cause.message);
				} finally {
					setBusy(false);
				}
			};

			const confirmAndRun = () => {
				if (!confirm) return;
				const kind = confirm.kind;
				const ids = confirm.ids;
				setConfirm(null);
				runAction(kind, ids);
			};

			const renderRow = (row) => {
				const session = row.session;
				const title = session ? session.displayTitle || session.title || row.id : row.id;
				const running = session ? !!session.running : false;
				const meta = [];
				if (running) meta.push(h("span", { className: "drb-running-badge" }, t("running")));
				if (row.trashedAt) meta.push(h("span", { key: "time" }, new Date(row.trashedAt).toLocaleString()));
				if (row.workspaceId) meta.push(h("span", { key: "ws" }, workspaceById.get(row.workspaceId)?.title || row.workspaceId));
				const singleActions = !selectionMode ? h("div", { className: "drb-row-actions" },
					tab === "archive"
						? h(Fragment, null,
							h(Button, {
								key: "unarchive",
								variant: "ghost",
								className: "drb-row-action",
								onClick: (e) => { e.stopPropagation(); runAction("unarchive", [row.id]); },
							}, t("batch.unarchive")),
							h(Button, {
								key: "trash",
								variant: "ghost",
								className: "drb-row-action drb-row-action-danger",
								onClick: (e) => {
									e.stopPropagation();
									setConfirm({
										kind: "trash",
										ids: [row.id],
										runningCount: running ? 1 : 0,
										runningNames: running ? [title] : [],
									});
								},
							}, t("batch.toTrash"))
						)
						: h(Fragment, null,
							h(Button, {
								key: "restore",
								variant: "ghost",
								className: "drb-row-action",
								onClick: (e) => { e.stopPropagation(); runAction("restore", [row.id]); },
							}, t("batch.restore")),
							h(Button, {
								key: "purge",
								variant: "ghost",
								className: "drb-row-action drb-row-action-danger",
								onClick: (e) => {
									e.stopPropagation();
									setConfirm({
										kind: "purge",
										ids: [row.id],
										runningCount: running ? 1 : 0,
										runningNames: running ? [title] : [],
									});
								},
							}, t("batch.purge"))
						)
				) : null;
				return h("div", { className: "drb-row" + (running ? " drb-row-running" : ""), key: row.id },
					selectionMode ? h("input", {
						type: "checkbox",
						checked: selectedSet.has(row.id),
						onChange: () => toggleOne(row.id),
					}) : null,
					h("div", { className: "drb-row-main" },
						h("div", { className: "drb-row-title" }, title),
						meta.length > 0 ? h("div", { className: "drb-row-meta" }, meta) : null
					),
					singleActions
				);
			};

			const renderGroup = (group) => {
				const ids = group.rows.map((row) => row.id);
				const allSelected = ids.length > 0 && ids.every((id) => selectedSet.has(id));
				const someSelected = ids.some((id) => selectedSet.has(id));
				return h("div", { className: "drb-group", key: group.key },
					h("div", { className: "drb-group-header" },
						selectionMode ? h("input", {
							type: "checkbox",
							checked: allSelected,
							ref: (el) => { if (el) el.indeterminate = !allSelected && someSelected; },
							onChange: () => toggleGroup(group.rows),
						}) : null,
						h("span", { className: "drb-group-label" }, group.label),
						h("span", { className: "drb-group-count" }, group.rows.length)
					),
					h("div", { className: "drb-group-rows" }, group.rows.map(renderRow))
				);
			};

			const listBody = grouped.length === 0
				? h("div", { className: "drb-empty" }, tab === "archive" ? t("empty.archive") : t("empty.trash"))
				: grouped.map(renderGroup);

			const toolbar = !selectionMode
				? h(Fragment, null,
					h("span", { className: "drb-toolbar-spacer" }),
					h(Button, { variant: "outline", onClick: () => { setSelected([]); setSelectionMode(true); } }, t("batch.start"))
				)
				: h(Fragment, null,
					h("span", { className: "drb-selected-count" }, t("batch.count", { count: selected.length })),
					h(Button, { variant: "outline", onClick: clearSelection, disabled: busy }, t("batch.cancel")),
					h("span", { className: "drb-toolbar-spacer" }),
					tab === "archive"
						? h(Fragment, null,
							h(Button, { variant: "outline", disabled: selected.length === 0 || busy, onClick: () => runAction("unarchive", selected) }, t("batch.unarchive")),
							h(Button, { variant: "primary", disabled: selected.length === 0 || busy, onClick: () => requestConfirm("trash") }, t("batch.toTrash"))
						)
						: h(Fragment, null,
							h(Button, { variant: "outline", disabled: selected.length === 0 || busy, onClick: () => runAction("restore", selected) }, t("batch.restore")),
							h(Button, { variant: "primary", className: "drb-danger", disabled: selected.length === 0 || busy, onClick: () => requestConfirm("purge") }, t("batch.purge"))
						)
				);

			const confirmBody = confirm ? (() => {
				const isPurge = confirm.kind === "purge";
				return h(Fragment, null,
					confirm.runningCount > 0 ? h(Fragment, null,
						h("div", { className: "drb-confirm-warning", role: "alert" },
							h(IconWarningOutline16, { size: 18 }),
							h("span", null, isPurge ? t("confirm.runningPurge", { count: confirm.runningCount }) : t("confirm.runningTrash", { count: confirm.runningCount }))
						),
						confirm.runningNames.length > 0 ? h("div", { className: "drb-running-list" }, confirm.runningNames.join("、")) : null
					) : null,
					h("div", { className: "drb-confirm-body" },
						isPurge
							? t("confirm.purge", { count: confirm.ids.length })
							: t("confirm.trash", { count: confirm.ids.length })
					)
				);
			})() : null;

			return h(Modal, {
				open,
				onClose: closePanel,
				title: t("title"),
				closeLabel: t("close"),
				className: "drb-dialog",
				contentClassName: "drb-content",
				footer: h(Button, { variant: "outline", onClick: closePanel, disabled: busy || !!confirm }, t("close")),
			},
				h("div", { className: "drb-tabs" },
					h("button", { type: "button", className: "drb-tab" + (tab === "archive" ? " drb-tab-active" : ""), onClick: () => switchTab("archive") },
						h(IconArchiveOutline20, { size: 16 }),
						t("tab.archive"),
						h("span", { className: "drb-count" }, archiveRows.length)
					),
					h("button", { type: "button", className: "drb-tab" + (tab === "trash" ? " drb-tab-active" : ""), onClick: () => switchTab("trash") },
						h(IconTrashOutline16, { size: 16 }),
						t("tab.trash"),
						h("span", { className: "drb-count" }, trashRows.length)
					)
				),
				notice ? h("div", { className: "drb-notice" }, notice) : null,
				error ? h("div", { className: "drb-error", role: "alert" }, error) : null,
				h("div", { className: "drb-toolbar" }, toolbar),
				h("div", { className: "drb-list" }, listBody),
				confirm ? h("div", { className: "drb-confirm-overlay" },
					h("div", { className: "drb-confirm-card", role: "dialog", "aria-modal": "true", "aria-label": confirm.kind === "purge" ? t("confirm.purgeTitle") : t("confirm.trashTitle") },
						h("div", { className: "drb-confirm-title" }, confirm.kind === "purge" ? t("confirm.purgeTitle") : t("confirm.trashTitle")),
						confirmBody,
						h("div", { className: "drb-confirm-actions" },
							h(Button, { variant: "outline", onClick: () => setConfirm(null), disabled: busy }, t("cancel")),
							h(Button, { variant: "primary", className: confirm.kind === "purge" ? "drb-danger" : "", onClick: confirmAndRun, disabled: busy }, confirm.kind === "purge" ? t("confirm.purgeAction") : t("confirm.trashAction"))
						)
					)
				) : null
			);
		}

		// ---------- sidebar batch archive enhancer ----------
		function BatchArchiveEnhancer({ t, getSessions, subscribeSessions, getWorkspaces, subscribeWorkspaces, refreshWorkspaces, archiveSession, disabled }) {
			const sessions = useSyncExternalStore(subscribeSessions, getSessions);
			const workspaces = useSyncExternalStore(subscribeWorkspaces, getWorkspaces);
			const [selectedIds, setSelectedIds] = useState([]);
			const [batchMenu, setBatchMenu] = useState(null);
			const [busy, setBusy] = useState(false);

			useEffect(() => {
				if (disabled) {
					setSelectedIds([]);
					setBatchMenu(null);
				}
			}, [disabled]);

			const sessionsRef = useRef(sessions);
			sessionsRef.current = sessions;
			const workspacesRef = useRef(workspaces);
			workspacesRef.current = workspaces;

			const computeVisibleIds = useCallback(() => {
				const currentSessions = sessionsRef.current;
				const currentWorkspaces = workspacesRef.current;
				const currentById = currentSessions.byId || {};
				const archivedSet = new Set(currentWorkspaces.archivedSessionIds || []);
				let viewState = {};
				try {
					viewState = JSON.parse(localStorage.getItem("dsh.workspace.view.v5") || "{}") || {};
				} catch {}
				const isVisible = (id) => {
					const session = currentById[id];
					if (!session) return false;
					if (session.blank && id !== currentSessions.current) return false;
					if (session.origin === "subagent") return false;
					if (archivedSet.has(id)) return false;
					return true;
				};
				const groupBy = viewState.groupBy || "workspace";
				if (groupBy === "flat") {
					const base = (currentSessions.ids || []).filter(isVisible);
					const flatOrder = viewState.sessionOrderByAccount?.["__flat_session_order__"] || [];
					const ordered = flatOrder.filter((id) => base.includes(id));
					return [...ordered, ...base.filter((id) => !ordered.includes(id))];
				}
				const expansion = viewState.groupExpansion || {};
				const ids = [];
				const accounted = new Set();
				for (const workspace of currentWorkspaces.items || []) {
					if (expansion[workspace.workspaceId] === false) continue;
					for (const sessionId of workspace.sessionIds || []) {
						if (isVisible(sessionId)) {
							ids.push(sessionId);
							accounted.add(sessionId);
						}
					}
				}
				if (expansion[""] !== false) {
					const ungroupedBase = (currentSessions.ids || []).filter((id) => !accounted.has(id) && isVisible(id));
					const ungroupedOrder = viewState.sessionOrderByAccount?.[""] || [];
					const orderedUngrouped = ungroupedOrder.filter((id) => ungroupedBase.includes(id));
					ids.push(...orderedUngrouped, ...ungroupedBase.filter((id) => !orderedUngrouped.includes(id)));
				}
				return ids;
			}, []);

			const syncCheckboxes = useCallback(() => {
				if (disabled) {
					document.querySelectorAll(".drb-sidebar-check").forEach((el) => el.remove());
					return;
				}
				const tree = findMainTree();
				if (!tree) return;
				const visibleIds = computeVisibleIds();
				const rows = Array.from(tree.querySelectorAll('div[role="treeitem"][aria-selected]'));
				rows.forEach((row, index) => {
					const id = visibleIds[index];
					const old = row.querySelector(":scope > .drb-sidebar-check");
					if (!id) {
						if (old) old.remove();
						return;
					}
					row.classList.add("drb-sidebar-row");
					let check = old;
					if (!check) {
						check = document.createElement("span");
						check.className = "drb-sidebar-check";
						check.setAttribute("role", "checkbox");
						check.setAttribute("aria-label", t("batch.select"));
						check.tabIndex = 0;
						row.insertBefore(check, row.firstChild);
					}
					check.dataset.sessionId = id;
					check.classList.toggle("drb-checked", selectedIds.includes(id));
					check.classList.toggle("drb-visible", selectedIds.length > 0);
				});
			}, [computeVisibleIds, selectedIds, disabled, t]);

			useEffect(() => {
				syncCheckboxes();
			}, [syncCheckboxes]);

			useEffect(() => {
				if (disabled) return;
				const observer = new MutationObserver(() => syncCheckboxes());
				observer.observe(document.body, { childList: true, subtree: true });
				return () => observer.disconnect();
			}, [syncCheckboxes, disabled]);

			useEffect(() => {
				const onDocumentClick = (event) => {
					const check = event.target.closest(".drb-sidebar-check");
					if (check && check.dataset.sessionId) {
						event.preventDefault();
						event.stopPropagation();
						const id = check.dataset.sessionId;
						setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
						return;
					}
					if (batchMenu && !event.target.closest(".drb-batch-menu")) {
						setBatchMenu(null);
					}
				};
				const onDocumentCapture = (event) => {
					if (disabled || selectedIds.length === 0) return;
					const button = event.target.closest('[class*="_rowActions"] button, [class*="rowActions"] button');
					if (!button) return;
					event.preventDefault();
					event.stopPropagation();
					const rect = button.getBoundingClientRect();
					setBatchMenu({ x: Math.max(8, rect.left), y: rect.bottom + 4 });
				};
				document.addEventListener("click", onDocumentClick);
				document.addEventListener("click", onDocumentCapture, true);
				return () => {
					document.removeEventListener("click", onDocumentClick);
					document.removeEventListener("click", onDocumentCapture, true);
				};
			}, [selectedIds, batchMenu, disabled]);

			const archiveSelected = async () => {
				if (selectedIds.length === 0 || busy) return;
				setBusy(true);
				try {
					for (const id of selectedIds.slice()) {
						try {
							await archiveSession(id);
						} catch (error) {
							console.warn("[dsh-recycle-bin] batch archive failed for", id, error);
						}
					}
					setSelectedIds([]);
					setBatchMenu(null);
					if (refreshWorkspaces) refreshWorkspaces().catch(() => {});
				} finally {
					setBusy(false);
				}
			};

			if (disabled) return null;

			return h(Fragment, null,
				selectedIds.length > 0 ? ReactDOM.createPortal(
					h("div", { className: "drb-batch-bar" },
						h("span", null, t("batch.sidebar.count", { count: selectedIds.length })),
						h(Button, { variant: "primary", onClick: archiveSelected, disabled: busy }, t("batch.sidebar.archive")),
						h(Button, { variant: "outline", onClick: () => setSelectedIds([]), disabled: busy }, t("cancel"))
					),
					document.body
				) : null,
				batchMenu ? ReactDOM.createPortal(
					h("div", { className: "drb-batch-menu", style: { left: batchMenu.x + "px", top: batchMenu.y + "px" } },
						h("button", { type: "button", className: "drb-batch-menu-item", onClick: archiveSelected, disabled: busy },
							t("batch.sidebar.archiveMany", { count: selectedIds.length })
						),
						h("button", { type: "button", className: "drb-batch-menu-item", onClick: () => { setSelectedIds([]); setBatchMenu(null); }, disabled: busy },
							t("cancel")
						)
					),
					document.body
				) : null
			);
		}

		// ---------- footer entry ----------
		function RecycleBinEntry({ wide, t, getSessions, subscribeSessions, getWorkspaces, subscribeWorkspaces, refreshSessions, refreshWorkspaces, archiveSession }) {
			const [open, setOpen] = useState(false);
			return h(Fragment, null,
				h(Tooltip, {
					label: t("entry.label"),
					delayMs: 500,
					disabled: wide,
					children: h("button", {
						type: "button",
						className: "drb-entry" + (wide ? "" : " drb-entry-rail"),
						"aria-label": t("entry.label"),
						title: wide ? t("entry.label") : undefined,
						onClick: () => setOpen(true),
					},
						h(IconTrashOutline16, { size: wide ? 16 : 18 }),
						wide ? h("span", { className: "drb-entry-label" }, t("entry.label")) : null
					)
				}),
				h(BatchArchiveEnhancer, {
					t,
					getSessions,
					subscribeSessions,
					getWorkspaces,
					subscribeWorkspaces,
					refreshWorkspaces,
					archiveSession,
					disabled: open,
				}),
				h(RecycleBinPanel, {
					open,
					onClose: () => setOpen(false),
					t,
					getSessions,
					subscribeSessions,
					getWorkspaces,
					subscribeWorkspaces,
					refreshSessions,
					refreshWorkspaces,
				})
			);
		}

		// ---------- registration ----------
		const LOCALE_NS = "dsh-recycle-bin";
		const inject = ["slots", "locale", "sessions", "workspaces"];

		const zh = {
			"entry.label": "回收站",
			"title": "回收站",
			"tab.archive": "归档",
			"tab.trash": "回收站",
			"batch.start": "批量操作",
			"batch.cancel": "完成",
			"batch.count": "已选 {count} 项",
			"batch.toTrash": "移入回收站",
			"batch.unarchive": "还原",
			"batch.restore": "还原",
			"batch.purge": "彻底删除",
			"batch.select": "选择",
			"batch.sidebar.count": "已选 {count} 项",
			"batch.sidebar.archive": "批量归档",
			"batch.sidebar.archiveMany": "批量归档 ({count})",
			"empty.archive": "暂无归档对话",
			"empty.trash": "回收站是空的",
			"running": "运行中",
			"ungrouped": "未分组",
			"close": "关闭",
			"cancel": "取消",
			"confirm.trashTitle": "移入回收站",
			"confirm.trash": "确定将 {count} 个归档对话移入回收站？移入后可在回收站中还原，不影响本地文件。",
			"confirm.runningTrash": "其中有 {count} 个对话正在运行！移入回收站不会中断任务，但请确认你了解当前状态。",
			"confirm.trashAction": "移入回收站",
			"confirm.purgeTitle": "彻底删除",
			"confirm.purge": "确定彻底删除 {count} 个对话？此操作会删除本地会话记录，且不可恢复。",
			"confirm.runningPurge": "其中有 {count} 个对话正在运行！彻底删除会删除其本地记录，可能影响正在执行的任务，请再次确认。",
			"confirm.purgeAction": "彻底删除",
			"done.moved": "已将 {count} 个对话移入回收站",
			"done.unarchived": "已还原 {count} 个归档对话",
			"done.restored": "已还原 {count} 个对话",
			"done.purged": "已彻底删除 {count} 个对话",
		};

		const en = {
			"entry.label": "Trash",
			"title": "Recycle Bin",
			"tab.archive": "Archived",
			"tab.trash": "Trash",
			"batch.start": "Batch",
			"batch.cancel": "Done",
			"batch.count": "{count} selected",
			"batch.toTrash": "Move to trash",
			"batch.unarchive": "Restore",
			"batch.restore": "Restore",
			"batch.purge": "Delete forever",
			"batch.select": "Select",
			"batch.sidebar.count": "{count} selected",
			"batch.sidebar.archive": "Archive selected",
			"batch.sidebar.archiveMany": "Archive selected ({count})",
			"empty.archive": "No archived conversations",
			"empty.trash": "Trash is empty",
			"running": "Running",
			"ungrouped": "Ungrouped",
			"close": "Close",
			"cancel": "Cancel",
			"confirm.trashTitle": "Move to trash",
			"confirm.trash": "Move {count} archived conversation(s) to trash? You can restore them later; local files are not touched.",
			"confirm.runningTrash": "{count} conversation(s) are currently running! Moving to trash does not interrupt tasks, but please confirm you understand.",
			"confirm.trashAction": "Move to trash",
			"confirm.purgeTitle": "Delete forever",
			"confirm.purge": "Permanently delete {count} conversation(s)? This removes local session records and cannot be undone.",
			"confirm.runningPurge": "{count} conversation(s) are currently running! Permanent deletion removes their local records and may affect running tasks. Confirm again.",
			"confirm.purgeAction": "Delete forever",
			"done.moved": "Moved {count} conversation(s) to trash",
			"done.unarchived": "Restored {count} archived conversation(s)",
			"done.restored": "Restored {count} conversation(s)",
			"done.purged": "Permanently deleted {count} conversation(s)",
		};

		function apply(ctx) {
			ctx.effect(() => {
				const disposers = [];
				for (const [locale, dict] of [["zh", zh], ["en", en]]) {
					disposers.push(ctx.locale.register(LOCALE_NS, locale, dict));
				}
				return () => {
					for (const dispose of disposers) dispose();
				};
			}, "dsh-recycle-bin: dictionaries");

			const injected = () => ({
				t: ctx.locale.bind(LOCALE_NS),
				getSessions: () => ctx.sessions.list.getSnapshot(),
				subscribeSessions: (listener) => ctx.sessions.list.subscribe(listener),
				getWorkspaces: () => ctx.workspaces.list.getSnapshot(),
				subscribeWorkspaces: (listener) => ctx.workspaces.list.subscribe(listener),
				refreshSessions: () => ctx.sessions.refresh(),
				refreshWorkspaces: () => ctx.workspaces.refresh(),
				archiveSession: (sessionId) => ctx.workspaces.archiveSession(sessionId),
			});

			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "dsh-recycle-bin",
				inject: injected,
			}, RecycleBinEntry));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
