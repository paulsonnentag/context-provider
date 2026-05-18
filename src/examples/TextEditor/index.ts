import type { Example } from "../types";
import { TextEditorExample } from "./setup";

const example: Example = {
  name: "Text Editor",
  description:
    "CodeMirror bound to Automerge, with a comment-cursor ViewPlugin and @-city autocomplete.",
  component: TextEditorExample,
};

export default example;
