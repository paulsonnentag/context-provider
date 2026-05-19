import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
} from "@codemirror/view";
import {
  Facet,
  RangeSetBuilder,
  StateEffect,
  StateField,
} from "@codemirror/state";
import { getCursorPosition } from "@automerge/automerge";
import type { DocHandle } from "@automerge/automerge-repo";
import type { Handle } from "@/core/handles";
import type { Comment } from "@/providers/Comments";

type Range = { from: number; to: number };

type TextCommentTarget = { startCursor: string; endCursor: string };

const isTextTarget = (t: unknown): t is TextCommentTarget =>
  !!t &&
  typeof (t as TextCommentTarget).startCursor === "string" &&
  typeof (t as TextCommentTarget).endCursor === "string";

const commentMark = Decoration.mark({ class: "cm-comment-highlight" });

// Per-instance config for the decorator. Read inside `StateField.create()` so
// the very first DecorationSet contains seeded comments, and inside the
// controller plugin for the live subscription.
type CommentSource = {
  handle: DocHandle<{ text: string }>;
  comments: Handle<Comment[]>;
};

const commentSourceFacet = Facet.define<CommentSource, CommentSource | null>({
  combine: (values) => (values.length > 0 ? values[0] : null),
});

const computeRanges = (source: CommentSource): Range[] => {
  const doc = source.handle.doc();
  const docLen = doc.text.length;
  const ranges: Range[] = [];
  for (const c of source.comments.value) {
    if (!isTextTarget(c.target)) continue;
    let from: number;
    let to: number;
    try {
      from = getCursorPosition(doc, ["text"], c.target.startCursor);
      to = getCursorPosition(doc, ["text"], c.target.endCursor);
    } catch {
      continue;
    }
    if (from > to) [from, to] = [to, from];
    from = Math.max(0, Math.min(from, docLen));
    to = Math.max(0, Math.min(to, docLen));
    if (from === to) continue;
    ranges.push({ from, to });
  }
  return ranges;
};

const buildDecoSet = (ranges: Range[]): DecorationSet => {
  const sorted = [...ranges].sort(
    (a, b) => a.from - b.from || a.to - b.to,
  );
  const builder = new RangeSetBuilder<Decoration>();
  for (const r of sorted) {
    if (r.from < r.to) builder.add(r.from, r.to, commentMark);
  }
  return builder.finish();
};

// Replaces the full set of decorated ranges. Following the CodeMirror
// "Decorations" guide: a StateEffect carries the update, a StateField stores
// the DecorationSet, and a ViewPlugin acts as the bridge to external state.
const setCommentRanges = StateEffect.define<Range[]>();

const commentDecorationsField = StateField.define<DecorationSet>({
  create(state) {
    const source = state.facet(commentSourceFacet);
    return source ? buildDecoSet(computeRanges(source)) : Decoration.none;
  },
  update(deco, tr) {
    // Map positions through the transaction's changes first (per the docs)
    // so existing ranges stay anchored across edits even if no effect arrives.
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setCommentRanges)) continue;
      deco = buildDecoSet(e.value);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Bridges the external comments Handle into the editor: whenever the comments
// array mutates, recompute ranges against the current Automerge snapshot and
// dispatch the effect. The initial set is supplied by `StateField.create`
// reading the facet, so this plugin never needs to dispatch during the view
// constructor (which would throw, since `updateState` is `Updating`).
const commentRangeController = ViewPlugin.fromClass(
  class {
    view: EditorView;
    source: CommentSource | null;
    onCommentsChange: () => void;

    constructor(view: EditorView) {
      this.view = view;
      this.source = view.state.facet(commentSourceFacet);
      this.onCommentsChange = () => {
        if (!this.source) return;
        this.view.dispatch({
          effects: setCommentRanges.of(computeRanges(this.source)),
        });
      };
      if (this.source) {
        this.source.comments.on("change", this.onCommentsChange);
      }
    }

    destroy() {
      if (this.source) {
        this.source.comments.off("change", this.onCommentsChange);
      }
    }
  },
);

export const commentRangePlugin = (
  handle: DocHandle<{ text: string }>,
  comments: Handle<Comment[]>,
) => [
  commentSourceFacet.of({ handle, comments }),
  commentDecorationsField,
  commentRangeController,
];
