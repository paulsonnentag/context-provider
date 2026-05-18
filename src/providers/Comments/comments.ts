import EventEmitter from "eventemitter3";
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import type { Selector } from "../../core/types";

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

export type CommentsState = {
  byDocUrl: { [url: string]: Comment[] };
};

export type ScopedCommentsEvents = {
  change: () => void;
};

// A url-scoped view onto a single target doc's @patchwork.comments. Mirrors
// the StateHandle shape (`value`, `change`, EventEmitter) so consumers can
// treat it like any other handle.
export class ScopedCommentsHandle extends EventEmitter<ScopedCommentsEvents> {
  #url: AutomergeUrl;
  #docHandle: DocHandle<PatchworkMetadata>;
  #onDocChange = () => this.emit("change");

  constructor(url: AutomergeUrl, docHandle: DocHandle<PatchworkMetadata>) {
    super();
    this.#url = url;
    this.#docHandle = docHandle;
    docHandle.on("change", this.#onDocChange);
  }

  get url(): AutomergeUrl {
    return this.#url;
  }

  get value(): Comment[] {
    return this.#docHandle.doc()?.["@patchwork"]?.comments ?? [];
  }

  change(mutator: (comments: Comment[]) => void): void {
    this.#docHandle.change((d) => {
      if (!d["@patchwork"]) d["@patchwork"] = {};
      if (!d["@patchwork"].comments) d["@patchwork"].comments = [];
      mutator(d["@patchwork"].comments);
    });
  }

  destroy(): void {
    this.#docHandle.off("change", this.#onDocChange);
    this.removeAllListeners();
  }
}
