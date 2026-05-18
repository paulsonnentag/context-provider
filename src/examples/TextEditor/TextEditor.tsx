import { render } from "solid-js/web";
import { getCursor, updateText } from "@automerge/automerge";
import { withDocHandle } from "../../core/withDocHandle";

export type TextDoc = { text: string };

export const TextEditor = withDocHandle<TextDoc>(({ element, handle }) => {
  let wrapper!: HTMLDivElement;
  let editor!: HTMLDivElement;
  let commentButton!: HTMLButtonElement;
  let applyingRemote = false;

  const onInput = () => {
    if (applyingRemote) return;
    const next = editor.textContent ?? "";
    handle.change((d) => updateText(d, ["text"], next));
  };

  // Belt-and-suspenders for browsers that don't fully honor plaintext-only.
  const onPaste = (event: ClipboardEvent) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") ?? "";
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    onInput();
  };

  const onChange = () => {
    const remote = handle.doc().text;
    if (editor.textContent === remote) return;

    // Preserve the caret offset across the textContent swap so a remote update
    // doesn't kick the user out of where they were typing.
    const selection = window.getSelection();
    const focused = document.activeElement === editor;
    const caret =
      focused && selection && selection.rangeCount > 0
        ? selection.getRangeAt(0).startOffset
        : null;

    applyingRemote = true;
    editor.textContent = remote;
    applyingRemote = false;

    if (focused && caret !== null && selection) {
      const node = editor.firstChild ?? editor;
      const clamped = Math.min(caret, (node.textContent ?? "").length);
      const range = document.createRange();
      range.setStart(node, clamped);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // Walk the DOM to convert a (node, offset) pair into a character offset
  // inside the editor. Robust against <br> nodes that some browsers insert
  // into plaintext-only contenteditables.
  const offsetWithinEditor = (node: Node, offset: number): number => {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.setEnd(node, offset);
    return range.toString().length;
  };

  const hideCommentButton = () => {
    commentButton.hidden = true;
  };

  const updateCommentButton = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return hideCommentButton();
    const range = selection.getRangeAt(0);
    if (range.collapsed) return hideCommentButton();
    if (!editor.contains(range.startContainer)) return hideCommentButton();
    if (!editor.contains(range.endContainer)) return hideCommentButton();

    // getClientRects() returns one rect per visual line, so [0] is exactly
    // the first line of the selection.
    const rects = range.getClientRects();
    if (rects.length === 0) return hideCommentButton();
    const firstLine = rects[0];
    const wrapperRect = wrapper.getBoundingClientRect();

    // Vertically center the button on the first line. Horizontal placement is
    // fixed (right gutter) in CSS so the button can never overlap text.
    const lineCenter = firstLine.top + firstLine.height / 2 - wrapperRect.top;
    const buttonHeight = commentButton.offsetHeight || 26;
    commentButton.style.top = `${lineCenter - buttonHeight / 2}px`;
    commentButton.hidden = false;
  };

  const onSelectionChange = () => updateCommentButton();

  const onCommentMouseDown = (event: MouseEvent) => {
    // Keep the editor's selection alive across the click.
    event.preventDefault();
  };

  const onCommentClick = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;
    if (!editor.contains(range.commonAncestorContainer)) return;

    const startIdx = offsetWithinEditor(range.startContainer, range.startOffset);
    const endIdx = offsetWithinEditor(range.endContainer, range.endOffset);
    const doc = handle.doc();
    const startCursor = getCursor(doc, ["text"], startIdx);
    const endCursor = getCursor(doc, ["text"], endIdx);

    console.log("[comment range]", {
      startIdx,
      endIdx,
      startCursor,
      endCursor,
      selectedText: doc.text.slice(startIdx, endIdx),
    });
  };

  handle.on("change", onChange);
  document.addEventListener("selectionchange", onSelectionChange);

  const dispose = render(
    () => (
      <div ref={wrapper} class="text-editor-wrapper">
        <div
          ref={editor}
          class="text-editor"
          contentEditable="plaintext-only"
          spellcheck={false}
          onInput={onInput}
          onPaste={onPaste}
        >
          {handle.doc().text}
        </div>
        <button
          ref={commentButton}
          type="button"
          class="comment-button"
          hidden
          onMouseDown={onCommentMouseDown}
          onClick={onCommentClick}
          aria-label="Comment on selection"
          title="Comment on selection"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M3 2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7l-3 3v-3H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
          </svg>
        </button>
      </div>
    ),
    element,
  );

  return () => {
    handle.off("change", onChange);
    document.removeEventListener("selectionchange", onSelectionChange);
    dispose();
  };
});
