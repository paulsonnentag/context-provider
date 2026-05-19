import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import { Doc } from "@/core/doc";
import { StateHandle } from "@/core/handles";
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
>(async ({ element, handle: commentsHandle }) => {
  element.style.display = "contents";

  const docsMap = subscribeToDocsIn<PatchworkMetadata>(element);

  const sync = () => {
    for (const url of Object.keys(docsMap.value) as AutomergeUrl[]) {
      if (url in commentsHandle.value) continue;
      const docHandle = docsMap.ref(url) as DocHandle<PatchworkMetadata>;
      const sub = docHandle.ref(["@patchwork", "comments"], []);
      commentsHandle.change((s) => {
        s[url] = sub as unknown as Comment[];
      });
    }
    for (const url of Object.keys(commentsHandle.value) as AutomergeUrl[]) {
      if (url in docsMap.value) continue;
      commentsHandle.change((s) => {
        delete s[url];
      });
    }
  };

  docsMap.on("change", sync);
  sync();

  const onRequest = (event: RequestEvent) => {
    const { url } = event.detail;
    if (!isCommentsSelector(event.detail.selector) || !url) return;
    event.stopPropagation();

    if (!(url in commentsHandle.value)) {
      commentsHandle.change((s) => {
        s[url] = [];
      });
      void (async () => {
        const dh = await request<DocHandle<PatchworkMetadata>>(
          element,
          Doc(url),
        );
        if (!dh) return;
        const sub = dh.ref(["@patchwork", "comments"], []);
        commentsHandle.change((s) => {
          s[url] = sub as unknown as Comment[];
        });
      })();
    }

    respond(event, commentsHandle.ref(url));
  };
  element.addEventListener("patchwork:request", onRequest);

  return () => {
    docsMap.off("change", sync);
    docsMap.destroy();
    element.removeEventListener("patchwork:request", onRequest);
    commentsHandle.change((s) => {
      for (const url of Object.keys(s) as AutomergeUrl[]) delete s[url];
    });
  };
});
