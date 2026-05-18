import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import { isValidAutomergeUrl } from "@automerge/automerge-repo";
import { request, respond } from "../../core/provider";
import { Doc } from "../../core/doc";
import { StateHandle } from "../../core/handles";
import type { Component, RequestEvent } from "../../core/types";
import {
  Comments,
  ScopedCommentsHandle,
  isCommentsSelector,
  type CommentsState,
  type PatchworkMetadata,
} from "./comments";

type PatchworkLifecycleDetail = { url: string | null };
type PatchworkLifecycleEvent = CustomEvent<PatchworkLifecycleDetail>;

type Tracked = {
  handle: DocHandle<PatchworkMetadata>;
  onChange: () => void;
  refs: number;
};

export const CommentsProvider: Component = async (element) => {
  // Combined view of every doc's comments, keyed by url. Maintained as the
  // provider observes patchwork:mount / patchwork:unmount events bubbling
  // from descendant <patchwork-view> elements.
  const state = new StateHandle<CommentsState>({ byDocUrl: {} });

  const tracked = new Map<AutomergeUrl, Tracked>();
  const loading = new Map<AutomergeUrl, Promise<DocHandle<PatchworkMetadata>>>();
  const scopedHandles = new Set<ScopedCommentsHandle>();

  const fetchDocHandle = (
    url: AutomergeUrl,
  ): Promise<DocHandle<PatchworkMetadata>> => {
    const existing = tracked.get(url);
    if (existing) return Promise.resolve(existing.handle);
    const inFlight = loading.get(url);
    if (inFlight) return inFlight;
    const promise = request<DocHandle<PatchworkMetadata>>(element, Doc(url));
    loading.set(url, promise);
    return promise.finally(() => loading.delete(url));
  };

  const refreshState = (url: AutomergeUrl, handle: DocHandle<PatchworkMetadata>) => {
    const list = handle.doc()?.["@patchwork"]?.comments ?? [];
    state.change((s) => {
      s.byDocUrl[url] = [...list];
    });
  };

  const startTracking = async (url: AutomergeUrl) => {
    const existing = tracked.get(url);
    if (existing) {
      existing.refs += 1;
      return;
    }

    const handle = await fetchDocHandle(url);

    // Another mount/request may have populated `tracked` while we awaited
    // the handle; in that case just bump the ref count.
    const recheck = tracked.get(url);
    if (recheck) {
      recheck.refs += 1;
      return;
    }

    const onChange = () => refreshState(url, handle);
    handle.on("change", onChange);
    tracked.set(url, { handle, onChange, refs: 1 });
    refreshState(url, handle);
  };

  const stopTracking = (url: AutomergeUrl) => {
    const entry = tracked.get(url);
    if (!entry) return;
    entry.refs -= 1;
    if (entry.refs > 0) return;
    entry.handle.off("change", entry.onChange);
    tracked.delete(url);
    state.change((s) => {
      delete s.byDocUrl[url];
    });
  };

  const onMount = (event: Event) => {
    const url = (event as PatchworkLifecycleEvent).detail.url;
    if (!url || !isValidAutomergeUrl(url)) return;
    void startTracking(url);
  };

  const onUnmount = (event: Event) => {
    const url = (event as PatchworkLifecycleEvent).detail.url;
    if (!url || !isValidAutomergeUrl(url)) return;
    stopTracking(url);
  };

  const onRequest = (event: Event) => {
    const ev = event as RequestEvent;
    if (!isCommentsSelector(ev.detail.selector)) return;
    const target = ev.target as HTMLElement | null;
    const url = target?.getAttribute("url");
    if (!url || !isValidAutomergeUrl(url)) return;

    // Claim the request synchronously so it doesn't bubble further while we
    // resolve the doc handle.
    ev.stopPropagation();

    void (async () => {
      const handle = await fetchDocHandle(url);
      const scoped = new ScopedCommentsHandle(url, handle);
      scopedHandles.add(scoped);
      respond(ev, scoped);
    })();
  };

  element.addEventListener("patchwork:mount", onMount);
  element.addEventListener("patchwork:unmount", onUnmount);
  element.addEventListener("patchwork:request", onRequest);

  return () => {
    element.removeEventListener("patchwork:mount", onMount);
    element.removeEventListener("patchwork:unmount", onUnmount);
    element.removeEventListener("patchwork:request", onRequest);
    for (const entry of tracked.values()) {
      entry.handle.off("change", entry.onChange);
    }
    tracked.clear();
    for (const scoped of scopedHandles) {
      scoped.destroy();
    }
    scopedHandles.clear();
  };
};
