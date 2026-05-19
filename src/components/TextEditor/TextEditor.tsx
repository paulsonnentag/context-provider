import { render } from "solid-js/web";
import { EditorView, minimalSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { getCursor } from "@automerge/automerge";
import { automergeSyncPlugin } from "@automerge/automerge-codemirror";
import type { DocHandle } from "@automerge/automerge-repo";
import type { Handle } from "../../core/handles";
import { withHandle } from "../../core/withHandle";
import { request } from "../../core/provider";
import { Comments, type Comment } from "../../providers/Comments";
import { commentButtonPlugin } from "./commentButtonPlugin";
import { mentionPlugin } from "./mentionPlugin";
import { mentionRenderer } from "./mentionRenderer";

export type TextDoc = { text: string };

type TextCommentTarget = {
  startCursor: string;
  endCursor: string;
};

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const TextEditor = withHandle<DocHandle<TextDoc>>(async ({ element, handle }) => {
  const comments = await request<Handle<Comment[]>>(element, Comments);

  let host!: HTMLDivElement;

  const dispose = render(
    () => <div ref={host} class="text-editor" />,
    element,
  );

  const view = new EditorView({
    state: EditorState.create({
      doc: handle.doc().text,
      extensions: [
        minimalSetup,
        EditorView.lineWrapping,
        automergeSyncPlugin({ handle, path: ["text"] }),
        mentionPlugin(),
        mentionRenderer(),
        commentButtonPlugin(({ from, to, selectedText }) => {
          const doc = handle.doc();
          const startCursor = getCursor(doc, ["text"], from);
          const endCursor = getCursor(doc, ["text"], to);
          comments.change((cs) => {
            cs.push({
              id: newId(),
              target: { startCursor, endCursor } satisfies TextCommentTarget,
              content: selectedText,
              createdAt: Date.now(),
            });
          });
        }),
      ],
    }),
    parent: host,
  });

  return () => {
    view.destroy();
    dispose();
  };
});
