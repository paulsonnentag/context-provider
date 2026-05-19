import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import { Doc } from "@/core/doc";
import { StateHandle, type Handle } from "@/core/handles";
import { subscribeToDocsIn } from "@/core/subscribeToDocsIn";
import { request, respond } from "@/core/provider";
import type { RequestEvent, Selector } from "@/core/types";
import { withHandle } from "@/core/withHandle";

export type Comment = {
  id: string;
  // Arbitrary identifier of what the comment is on inside the target document.
  // TextEditor stores `{ startCursor, endCursor }`; other consumers can store
  // whatever they need.
  target: unknown;
  // Frozen quote of what was originally selected when the comment was created.
  snippet: string;
  // User-authored body. May be empty until the user types something.
  content: string;
  // When defined the comment is in edit mode and `draft` holds the pending
  // text; saving copies it into `content` and removes `draft`.
  draft?: string;
  createdAt: number;
};

export type PatchworkMetadata = {
  "@patchwork"?: {
    comments?: Comment[];
    title?: string;
  };
};

// Resolve a Handle<string> over `@patchwork.title` for the given url via the
// provider chain (RepoProvider). Vivifies an empty string when the field is
// absent so consumers always get a live handle they can subscribe to.
export async function requestTitleHandle(
  element: HTMLElement,
  url: AutomergeUrl,
): Promise<Handle<string> | null> {
  const dh = await request<DocHandle<PatchworkMetadata>>(element, Doc(url));
  if (!dh) return null;
  // Vivify ensures the slot is always a string at runtime; widen the static
  // `string | undefined` (from the optional title field) back to `string`.
  return dh.ref(["@patchwork", "title"], "") as Handle<string>;
}

export const Comments: Selector = { type: "comments" };

export const isCommentsSelector = (s: Selector): boolean =>
  s.type === Comments.type;

export const CommentsProvider = withHandle<
  StateHandle<Record<AutomergeUrl, Comment[]>>
>(async ({ element, handle: commentsHandle }) => {
  element.style.display = "contents";

  const docsHandle = subscribeToDocsIn<PatchworkMetadata>(element);

  const sync = () => {
    for (const url of Object.keys(docsHandle.value) as AutomergeUrl[]) {
      if (url in commentsHandle.value) continue;
      const docHandle = docsHandle.ref(url);
      const sub = docHandle.ref(["@patchwork", "comments"], []);
      commentsHandle.change((s) => {
        s[url] = sub as unknown as Comment[];
      });
    }
    for (const url of Object.keys(commentsHandle.value) as AutomergeUrl[]) {
      if (url in docsHandle.value) continue;
      commentsHandle.change((s) => {
        delete s[url];
      });
    }
  };

  docsHandle.on("change", sync);
  sync();

  const onRequest = async (event: RequestEvent) => {
    const { url } = event.detail;
    if (!isCommentsSelector(event.detail.selector) || !url) return;
    event.stopPropagation();

    if (!(url in commentsHandle.value)) {
      commentsHandle.change((s) => {
        s[url] = [];
      });

      const dh = await request<DocHandle<PatchworkMetadata>>(element, Doc(url));
      if (!dh) return;
      const sub = dh.ref(["@patchwork", "comments"], []);
      commentsHandle.change((s) => {
        s[url] = sub as unknown as Comment[];
      });
    }

    respond(event, commentsHandle.ref(url));
  };
  element.addEventListener("patchwork:request", onRequest);

  return () => {
    docsHandle.off("change", sync);
    docsHandle.destroy();
    element.removeEventListener("patchwork:request", onRequest);
    commentsHandle.change((s) => {
      for (const url of Object.keys(s) as AutomergeUrl[]) delete s[url];
    });
  };
});
