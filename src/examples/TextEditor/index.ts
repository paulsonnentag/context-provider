import type { Example } from "../types";
import { TextEditorExample } from "./setup";

const example: Example = {
  name: "Text Editor",
  description:
    "Plain-text contenteditable synced through automerge.updateText().",
  component: TextEditorExample,
};

export default example;
