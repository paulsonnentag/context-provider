import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import { isValidAutomergeUrl } from "@automerge/automerge-repo";
import { Doc } from "../../core/doc";
import { StateHandle } from "../../core/handles";
import type { PatchworkLifecycleEvent } from "../../core/patchwork-view";
import { request, respond } from "../../core/provider";
import type { RequestEvent, Selector } from "../../core/types";
import { withHandle } from "../../core/withHandle";

export type Comment = {
  id: string;
  // Arbitrary identifier of what the comment is on inside the target document.
  // TextEditor stores `{ startCursor, endCursor }`; other consumers can store
  // whatever they need.
  target: unknown;
  content: string;
  createdAt: number;
};

export type PatchworkMetadata = {
  "@patchwork"?: {
    comments?: Comment[];
  };
};

export const Comments = { type: "comments" } as const satisfies Selector;
export type CommentsSelector = typeof Comments;

export const isCommentsSelector = (s: Selector): s is CommentsSelector =>
  s.type === Comments.type;

export const CommentsProvider = withHandle<
  StateHandle<Record<AutomergeUrl, Comment[]>>
>(async ({ element, handle: state }) => {
  element.style.display = "contents";

  const refs = new Map<AutomergeUrl, number>();
  const loading = new Map<AutomergeUrl, Promise<void>>();

  const ensureLoaded = (url: AutomergeUrl): Promise<void> => {
    if (state.value[url] !== undefined) return Promise.resolve();
    const inFlight = loading.get(url);
    if (inFlight) return inFlight;

    const p = (async () => {
      const dh = await request<DocHandle<PatchworkMetadata>>(element, Doc(url));
      if (!dh) {
        console.warn(
          `CommentsProvider: no provider responded for Doc(${url}). ` +
            "Make sure a RepoProvider is mounted above this view.",
        );
        return;
      }
      if (state.value[url] === undefined) {
        // `dh.ref([...], [])` vivifies `@patchwork.comments` if missing.
        // The cast covers the static gap between the slot's plain-value type
        // and the Handle that the StateHandle proxy resolves at runtime.
        const sub = dh.ref(["@patchwork", "comments"], []);
        state.change((s) => {
          s[url] = sub as unknown as Comment[];
        });
      }
    })();

    loading.set(url, p);
    return p.finally(() => loading.delete(url));
  };

  const acquire = async (url: AutomergeUrl): Promise<void> => {
    const prev = refs.get(url) ?? 0;
    refs.set(url, prev + 1);
    if (prev === 0) await ensureLoaded(url);
  };

  const release = (url: AutomergeUrl): void => {
    const r = refs.get(url);
    if (!r) return;
    if (r > 1) {
      refs.set(url, r - 1);
      return;
    }
    refs.delete(url);
    state.change((s) => {
      delete s[url];
    });
  };

  const onMount = (event: PatchworkLifecycleEvent) => {
    const { url } = event.detail;
    if (!url || !isValidAutomergeUrl(url)) return;
    void acquire(url);
  };

  const onUnmount = (event: PatchworkLifecycleEvent) => {
    const { url } = event.detail;
    if (!url || !isValidAutomergeUrl(url)) return;
    release(url);
  };

  const onRequest = async (event: RequestEvent) => {
    const { url } = event.detail;
    if (!isCommentsSelector(event.detail.selector) || !url) return;

    event.stopPropagation();

    void (async () => {
      await ensureLoaded(url);
      const sub = state.ref(url);
      if (sub) respond(event, sub);
    })();
  };

  element.addEventListener("patchwork:mount", onMount);
  element.addEventListener("patchwork:unmount", onUnmount);
  element.addEventListener("patchwork:request", onRequest);

  return () => {
    element.removeEventListener("patchwork:mount", onMount);
    element.removeEventListener("patchwork:unmount", onUnmount);
    element.removeEventListener("patchwork:request", onRequest);
    state.change((s) => {
      for (const url of refs.keys()) delete s[url];
    });
    refs.clear();
  };
});
