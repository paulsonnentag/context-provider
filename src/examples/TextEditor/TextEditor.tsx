import { render } from "solid-js/web";
import { EditorView, minimalSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { getCursor } from "@automerge/automerge";
import { automergeSyncPlugin } from "@automerge/automerge-codemirror";
import { withDocHandle } from "../../core/withDocHandle";
import { commentButtonPlugin } from "./commentButtonPlugin";

export type TextDoc = { text: string };

const CITIES = [
  "Amsterdam", "Athens", "Austin", "Bangkok", "Barcelona", "Beijing",
  "Berlin", "Boston", "Brussels", "Budapest", "Buenos Aires", "Cairo",
  "Cape Town", "Chicago", "Copenhagen", "Delhi", "Denver", "Dubai",
  "Dublin", "Frankfurt", "Geneva", "Hamburg", "Helsinki", "Hong Kong",
  "Istanbul", "Jakarta", "Kyiv", "Lima", "Lisbon", "London",
  "Los Angeles", "Madrid", "Manila", "Melbourne", "Mexico City",
  "Miami", "Milan", "Montreal", "Moscow", "Mumbai", "Munich", "Naples",
  "New York", "Oslo", "Paris", "Prague", "Reykjavik", "Rio de Janeiro",
  "Rome", "San Francisco", "Santiago", "São Paulo", "Seattle", "Seoul",
  "Shanghai", "Singapore", "Stockholm", "Sydney", "Taipei", "Tokyo",
  "Toronto", "Vancouver", "Vienna", "Warsaw", "Washington", "Zurich",
];

const cityCompletion = (
  context: CompletionContext,
): CompletionResult | null => {
  const match = context.matchBefore(/@[\w ]*/);
  if (!match) return null;
  if (match.from === match.to && !context.explicit) return null;
  const search = match.text.slice(1).toLowerCase();
  return {
    from: match.from,
    options: CITIES.filter((c) => c.toLowerCase().includes(search)).map(
      (label) => ({ label, apply: label }),
    ),
    validFor: /^@[\w ]*$/,
  };
};

export const TextEditor = withDocHandle<TextDoc>(({ element, handle }) => {
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
        autocompletion({ override: [cityCompletion] }),
        commentButtonPlugin(({ from, to, selectedText }) => {
          const doc = handle.doc();
          const startCursor = getCursor(doc, ["text"], from);
          const endCursor = getCursor(doc, ["text"], to);
          console.log("[comment range]", {
            from,
            to,
            startCursor,
            endCursor,
            selectedText,
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
