import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
} from "@codemirror/view";
import {
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

// Replaces the full set of decorated ranges. Following the CodeMirror
// "Decorations" guide: a StateEffect carries the update, a StateField stores
// the DecorationSet, and a ViewPlugin acts as the bridge to external state.
const setCommentRanges = StateEffect.define<Range[]>();

const commentDecorationsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    // Map positions through the transaction's changes first (per the docs)
    // so existing ranges stay anchored across edits even if no effect arrives.
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setCommentRanges)) continue;
      const sorted = [...e.value].sort(
        (a, b) => a.from - b.from || a.to - b.to,
      );
      const builder = new RangeSetBuilder<Decoration>();
      for (const r of sorted) {
        if (r.from < r.to) builder.add(r.from, r.to, commentMark);
      }
      deco = builder.finish();
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const commentRangeController = (
  handle: DocHandle<{ text: string }>,
  comments: Handle<Comment[]>,
) =>
  ViewPlugin.fromClass(
    class {
      view: EditorView;
      onCommentsChange: () => void;

      constructor(view: EditorView) {
        this.view = view;
        this.onCommentsChange = () => this.recompute();
        comments.on("change", this.onCommentsChange);
        // Initial pass: resolve cursors against the current doc snapshot.
        this.recompute();
      }

      recompute() {
        const doc = handle.doc();
        const docLen = doc.text.length;
        const ranges: Range[] = [];
        for (const c of comments.value) {
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
        this.view.dispatch({ effects: setCommentRanges.of(ranges) });
      }

      destroy() {
        comments.off("change", this.onCommentsChange);
      }
    },
  );

export const commentRangePlugin = (
  handle: DocHandle<{ text: string }>,
  comments: Handle<Comment[]>,
) => [commentDecorationsField, commentRangeController(handle, comments)];
