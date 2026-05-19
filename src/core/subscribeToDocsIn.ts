import {
  isValidAutomergeUrl,
  type AutomergeUrl,
  type DocHandle,
} from "@automerge/automerge-repo";
import { Doc } from "./doc";
import { StateHandle } from "./handles";
import type { PatchworkLifecycleEvent } from "./patchwork-view";
import { request } from "./provider";

export function subscribeToDocsIn<T = unknown>(
  element: HTMLElement,
): StateHandle<Record<AutomergeUrl, T>> {
  const state = new StateHandle<Record<AutomergeUrl, T>>({});
  const refs = new Map<AutomergeUrl, number>();
  const gen = new Map<AutomergeUrl, number>();

  const acquire = async (url: AutomergeUrl): Promise<void> => {
    const prev = refs.get(url) ?? 0;
    refs.set(url, prev + 1);
    if (prev > 0) return;

    const myGen = (gen.get(url) ?? 0) + 1;
    gen.set(url, myGen);

    const dh = await request<DocHandle<T>>(element, Doc(url));
    if (gen.get(url) !== myGen) return;
    if (!dh) {
      console.warn(
        `mountedDocs: no provider responded for Doc(${url}). ` +
          "Make sure a RepoProvider is mounted above this element.",
      );
      return;
    }
    state.change((s) => {
      s[url] = dh as unknown as T;
    });
  };

  const release = (url: AutomergeUrl): void => {
    const r = refs.get(url);
    if (!r) return;
    if (r > 1) {
      refs.set(url, r - 1);
      return;
    }
    refs.delete(url);
    // Bump the generation so an in-flight acquire's await won't overwrite
    // us after we've decided to drop the url.
    gen.set(url, (gen.get(url) ?? 0) + 1);
    if (url in state.value) {
      state.change((s) => {
        delete s[url];
      });
    }
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

  element.addEventListener("patchwork:mount", onMount);
  element.addEventListener("patchwork:unmount", onUnmount);

  // Augment destroy to also remove the lifecycle listeners we registered,
  // so callers get a single uniform teardown hook.
  const baseDestroy = state.destroy.bind(state);
  state.destroy = () => {
    element.removeEventListener("patchwork:mount", onMount);
    element.removeEventListener("patchwork:unmount", onUnmount);
    refs.clear();
    gen.clear();
    baseDestroy();
  };

  return state;
}
