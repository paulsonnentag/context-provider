import { createSignal, For, Show } from "solid-js";
import { render } from "solid-js/web";
import { EditorView, minimalSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { getCursor } from "@automerge/automerge";
import { automergeSyncPlugin } from "@automerge/automerge-codemirror";
import { withDocHandle } from "../../core/withDocHandle";
import { request } from "../../core/provider";
import {
  Comments,
  ScopedCommentsHandle,
  type Comment,
} from "../../providers/Comments";
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

export const TextEditor = withDocHandle<TextDoc>(async ({ element, handle }) => {
  const commentsHandle = await request<ScopedCommentsHandle>(element, Comments);

  const [comments, setComments] = createSignal<Comment[]>(commentsHandle.value);
  const onCommentsChange = () => setComments([...commentsHandle.value]);
  commentsHandle.on("change", onCommentsChange);

  let host!: HTMLDivElement;

  const dispose = render(
    () => (
      <div class="text-editor-shell">
        <div ref={host} class="text-editor" />
        <Show when={comments().length > 0}>
          <aside class="comments-panel">
            <h3 class="comments-title">Comments</h3>
            <ul class="comments-list">
              <For each={comments()}>
                {(comment) => (
                  <li class="comment">
                    <div class="comment-content">{comment.content}</div>
                    <div class="comment-meta">
                      {new Date(comment.createdAt).toLocaleTimeString()}
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </aside>
        </Show>
      </div>
    ),
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
          commentsHandle.change((cs) => {
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
    commentsHandle.off("change", onCommentsChange);
    commentsHandle.destroy();
    dispose();
  };
});
