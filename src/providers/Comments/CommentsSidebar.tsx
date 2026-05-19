import { createSignal, For, Show } from "solid-js";
import { render } from "solid-js/web";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import type { MapHandle } from "@/core/handles";
import { withHandle } from "@/core/withHandle";
import type { Comment } from "./CommentsProvider";

// Renders every comment aggregated by a CommentsProvider, grouped by doc url,
// and lets the user edit or delete each one. The MapHandle is injected via
// `prop:handle` from the same instance the CommentsProvider was given, so
// additions/removals stream in live.
export const CommentsSidebar = withHandle<MapHandle<AutomergeUrl, Comment[]>>(
  ({ element, handle: map }) => {
    const [groups, setGroups] = createSignal(map.value);
    const onChange = () => setGroups({ ...map.value });
    map.on("change", onChange);

    const entries = () =>
      Object.entries(groups()) as [AutomergeUrl, Comment[]][];

    const [editingId, setEditingId] = createSignal<string | null>(null);
    const [draft, setDraft] = createSignal("");

    const startEdit = (c: Comment) => {
      setDraft(c.content);
      setEditingId(c.id);
    };

    const cancelEdit = () => setEditingId(null);

    const saveEdit = (url: AutomergeUrl, id: string) => {
      const value = draft();
      const handle = map.get(url);
      if (!handle) return;
      handle.change((cs) => {
        const c = cs.find((c) => c.id === id);
        if (c) c.content = value;
      });
      setEditingId(null);
    };

    const remove = (url: AutomergeUrl, id: string) => {
      const handle = map.get(url);
      if (!handle) return;
      handle.change((cs) => {
        const i = cs.findIndex((c) => c.id === id);
        if (i !== -1) cs.splice(i, 1);
      });
      if (editingId() === id) setEditingId(null);
    };

    const dispose = render(
      () => (
        <aside class="comments-sidebar">
          <h3 class="comments-sidebar-title">All comments</h3>
          <Show
            when={entries().length > 0}
            fallback={
              <p class="comments-sidebar-empty">No comments yet.</p>
            }
          >
            <div class="comments-sidebar-scroll">
              <For each={entries()}>
                {([url, cs]) => (
                  <Show when={cs.length > 0}>
                    <section class="comments-sidebar-group">
                      <header
                        class="comments-sidebar-group-header"
                        title={url}
                      >
                        {url.slice(0, 16)}…
                      </header>
                      <ul class="comments-sidebar-list">
                        <For each={cs}>
                          {(comment) => (
                            <li class="comments-sidebar-item">
                              <Show
                                when={editingId() === comment.id}
                                fallback={
                                  <>
                                    <div
                                      class="comments-sidebar-item-content"
                                      onDblClick={() => startEdit(comment)}
                                    >
                                      {comment.content}
                                    </div>
                                    <div class="comments-sidebar-item-footer">
                                      <span class="comments-sidebar-item-meta">
                                        {new Date(
                                          comment.createdAt,
                                        ).toLocaleTimeString()}
                                      </span>
                                      <div class="comments-sidebar-item-actions">
                                        <button
                                          type="button"
                                          class="comments-sidebar-action"
                                          onClick={() => startEdit(comment)}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          class="comments-sidebar-action comments-sidebar-action--danger"
                                          onClick={() =>
                                            remove(url, comment.id)
                                          }
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                }
                              >
                                <textarea
                                  class="comments-sidebar-edit"
                                  autofocus
                                  value={draft()}
                                  onInput={(e) =>
                                    setDraft(e.currentTarget.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                      e.preventDefault();
                                      cancelEdit();
                                    } else if (
                                      e.key === "Enter" &&
                                      (e.metaKey || e.ctrlKey)
                                    ) {
                                      e.preventDefault();
                                      saveEdit(url, comment.id);
                                    }
                                  }}
                                />
                                <div class="comments-sidebar-item-footer">
                                  <span class="comments-sidebar-item-meta">
                                    ⌘↵ to save · esc to cancel
                                  </span>
                                  <div class="comments-sidebar-item-actions">
                                    <button
                                      type="button"
                                      class="comments-sidebar-action"
                                      onClick={cancelEdit}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      class="comments-sidebar-action comments-sidebar-action--primary"
                                      onClick={() => saveEdit(url, comment.id)}
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              </Show>
                            </li>
                          )}
                        </For>
                      </ul>
                    </section>
                  </Show>
                )}
              </For>
            </div>
          </Show>
        </aside>
      ),
      element,
    );

    return () => {
      map.off("change", onChange);
      dispose();
    };
  },
);
