import { ViewPlugin, type EditorView, type ViewUpdate } from "@codemirror/view";

export type CommentRange = {
  from: number;
  to: number;
  selectedText: string;
};

const COMMENT_ICON = `
  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
    <path d="M3 2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7l-3 3v-3H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
  </svg>`;

export const commentButtonPlugin = (
  onComment: (range: CommentRange, view: EditorView) => void,
) =>
  ViewPlugin.fromClass(
    class {
      button: HTMLButtonElement;

      constructor(public view: EditorView) {
        this.button = document.createElement("button");
        this.button.type = "button";
        this.button.className = "cm-comment-button";
        this.button.hidden = true;
        this.button.title = "Comment on selection";
        this.button.setAttribute("aria-label", "Comment on selection");
        this.button.innerHTML = COMMENT_ICON;
        // Keep the selection alive across the click.
        this.button.addEventListener("mousedown", (e) => e.preventDefault());
        this.button.addEventListener("click", () => {
          const sel = view.state.selection.main;
          if (sel.empty) return;
          const selectedText = view.state.doc.sliceString(sel.from, sel.to);
          onComment({ from: sel.from, to: sel.to, selectedText }, view);
          // Collapse the selection so the comment button hides and the user
          // gets feedback that the action landed.
          view.dispatch({ selection: { anchor: sel.from } });
        });
        view.dom.appendChild(this.button);
        this.scheduleReposition();
      }

      update(update: ViewUpdate) {
        if (
          update.selectionSet ||
          update.docChanged ||
          update.viewportChanged ||
          update.geometryChanged
        ) {
          this.scheduleReposition();
        }
      }

      scheduleReposition() {
        // Reading layout (coordsAtPos / getBoundingClientRect) is not allowed
        // during an editor update, so defer it to a measure phase.
        this.view.requestMeasure({
          read: (view) => {
            const sel = view.state.selection.main;
            if (sel.empty) return null;
            const coords = view.coordsAtPos(sel.from);
            if (!coords) return null;
            const editorRect = view.dom.getBoundingClientRect();
            return (coords.top + coords.bottom) / 2 - editorRect.top;
          },
          write: (lineCenter) => {
            if (lineCenter == null) {
              this.button.hidden = true;
              return;
            }
            // 13 = half the 26px button height.
            this.button.style.top = `${lineCenter - 13}px`;
            this.button.hidden = false;
          },
        });
      }

      destroy() {
        this.button.remove();
      }
    },
  );
