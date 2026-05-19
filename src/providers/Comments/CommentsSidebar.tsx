import { createSignal, For, Show } from "solid-js";
import { render } from "solid-js/web";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import { StateHandle } from "@/core/handles";
import { withHandle } from "@/core/withHandle";
import { requestTitleHandle, type Comment } from "./CommentsProvider";

// Renders every comment aggregated by a CommentsProvider, grouped by doc url,
// and lets the user edit the body or delete each one. The StateHandle is
// injected via `prop:handle` from the same instance the CommentsProvider was
// given, so additions/removals stream in live; per-doc edits go through the
// mounted sub-handle returned by `state.ref(url)`.
export const CommentsSidebar = withHandle<
  StateHandle<Record<AutomergeUrl, Comment[]>>
>(({ element, handle: state }) => {
  const [groups, setGroups] = createSignal(state.value);

  // Local map of url -> title. We mount each resolved `Handle<string>` (from
  // `requestTitleHandle`) into a StateHandle slot so the title stays live for
  // free; reading `titles.value[url]` always reflects the source doc.
  const titles = new StateHandle<Record<AutomergeUrl, string>>({});
  const [titlesView, setTitlesView] = createSignal(titles.value);
  titles.on("change", () => setTitlesView({ ...titles.value }));

  const ensureTitle = async (url: AutomergeUrl) => {
    if (url in titles.value) return;
    // Placeholder so a second pass during the await doesn't re-request.
    titles.change((s) => {
      s[url] = "";
    });
    const handle = await requestTitleHandle(element, url);
    if (!handle) return;
    titles.change((s) => {
      s[url] = handle as unknown as string;
    });
  };

  const syncTitles = () => {
    for (const url of Object.keys(state.value) as AutomergeUrl[]) {
      void ensureTitle(url);
    }
    for (const url of Object.keys(titles.value) as AutomergeUrl[]) {
      if (url in state.value) continue;
      titles.change((s) => {
        delete s[url];
      });
    }
  };

  const onChange = () => {
    setGroups({ ...state.value });
    syncTitles();
  };
  state.on("change", onChange);
  syncTitles();

  const entries = () =>
    Object.entries(groups()) as [AutomergeUrl, Comment[]][];

  const titleFor = (url: AutomergeUrl) =>
    titlesView()[url] || `${url.slice(0, 16)}…`;

  const startEdit = (url: AutomergeUrl, id: string) => {
    state.ref(url).change((cs) => {
      const c = cs.find((c) => c.id === id);
      if (c && c.draft === undefined) c.draft = c.content;
    });
  };

  const updateDraft = (url: AutomergeUrl, id: string, value: string) => {
    state.ref(url).change((cs) => {
      const c = cs.find((c) => c.id === id);
      if (c && c.draft !== value) c.draft = value;
    });
  };

  const saveEdit = (url: AutomergeUrl, id: string) => {
    state.ref(url).change((cs) => {
      const c = cs.find((c) => c.id === id);
      if (!c || c.draft === undefined) return;
      c.content = c.draft;
      delete c.draft;
    });
  };

  const cancelEdit = (url: AutomergeUrl, id: string) => {
    state.ref(url).change((cs) => {
      const c = cs.find((c) => c.id === id);
      if (c) delete c.draft;
    });
  };

  const remove = (url: AutomergeUrl, id: string) => {
    state.ref(url).change((cs) => {
      const i = cs.findIndex((c) => c.id === id);
      if (i !== -1) cs.splice(i, 1);
    });
  };

  const dispose = render(
    () => (
      <aside class="comments-sidebar">
        <h3 class="comments-sidebar-title">All comments</h3>
        <Show
          when={entries().length > 0}
          fallback={<p class="comments-sidebar-empty">No comments yet.</p>}
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
                      {titleFor(url)}
                    </header>
                    <ul class="comments-sidebar-list">
                      <For each={cs}>
                        {(comment) => (
                          <li class="comments-sidebar-item">
                            <Show when={comment.snippet}>
                              <blockquote class="comments-sidebar-item-quote">
                                {comment.snippet}
                              </blockquote>
                            </Show>
                            <Show
                              when={comment.draft !== undefined}
                              fallback={
                                <>
                                  <Show
                                    when={comment.content}
                                    fallback={
                                      <div class="comments-sidebar-item-content comments-sidebar-item-content--empty">
                                        No comment yet.
                                      </div>
                                    }
                                  >
                                    <div
                                      class="comments-sidebar-item-content"
                                      onDblClick={() =>
                                        startEdit(url, comment.id)
                                      }
                                    >
                                      {comment.content}
                                    </div>
                                  </Show>
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
                                        onClick={() =>
                                          startEdit(url, comment.id)
                                        }
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        class="comments-sidebar-action comments-sidebar-action--danger"
                                        onClick={() => remove(url, comment.id)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </>
                              }
                            >
                              <textarea
                                class="comments-sidebar-item-edit"
                                autofocus
                                placeholder="Add a comment…"
                                value={comment.draft ?? ""}
                                onInput={(e) =>
                                  updateDraft(
                                    url,
                                    comment.id,
                                    e.currentTarget.value,
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    e.preventDefault();
                                    cancelEdit(url, comment.id);
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
                                    onClick={() => cancelEdit(url, comment.id)}
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
                                  <button
                                    type="button"
                                    class="comments-sidebar-action comments-sidebar-action--danger"
                                    onClick={() => remove(url, comment.id)}
                                  >
                                    Delete
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
    state.off("change", onChange);
    titles.destroy();
    dispose();
  };
});
