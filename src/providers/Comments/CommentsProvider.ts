import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import { isValidAutomergeUrl } from "@automerge/automerge-repo";
import { Doc } from "../../core/doc";
import { MapHandle, subHandle } from "../../core/handles";
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

// Parent owns the aggregate MapHandle (keyed by url) and passes it in via
// `prop:handle`; the CommentsSidebar can subscribe to the same instance.
export const CommentsProvider = withHandle<MapHandle<AutomergeUrl, Comment[]>>(
  async ({ element, handle: map }) => {
    element.style.display = "contents";

    // Ref counts are driven by patchwork:mount/unmount lifecycle only;
    // requests just borrow the tracked sub-handle without touching refs.
    const refs = new Map<AutomergeUrl, number>();
    const loading = new Map<AutomergeUrl, Promise<void>>();

    const ensureLoaded = (url: AutomergeUrl): Promise<void> => {
      if (map.has(url)) return Promise.resolve();
      const inFlight = loading.get(url);
      if (inFlight) return inFlight;

      const p = (async () => {
        const dh = await request<DocHandle<PatchworkMetadata>>(
          element,
          Doc(url),
        );
        if (!dh) {
          console.warn(
            `CommentsProvider: no provider responded for Doc(${url}). ` +
              "Make sure a RepoProvider is mounted above this view.",
          );
          return;
        }
        // SubHandle.change throws on missing path; vivify @patchwork.comments
        // once before vending the sub-handle.
        if (dh.value["@patchwork"]?.comments == null) {
          dh.change((d) => {
            if (!d["@patchwork"]) d["@patchwork"] = {};
            if (!d["@patchwork"].comments) d["@patchwork"].comments = [];
          });
        }
        if (!map.has(url)) {
          map.set(url, subHandle(dh, ["@patchwork", "comments"]));
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
      map.delete(url);
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

    const onRequest = (event: RequestEvent) => {
      if (!isCommentsSelector(event.detail.selector)) return;
      const target = event.target as HTMLElement | null;
      const url = target?.getAttribute("url");
      if (!url || !isValidAutomergeUrl(url)) return;

      // Claim synchronously so the request doesn't bubble further while we
      // resolve the SubHandle.
      event.stopPropagation();

      void (async () => {
        await ensureLoaded(url);
        const sub = map.get(url);
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
      for (const url of refs.keys()) map.delete(url);
      refs.clear();
    };
  },
);
