import type { Example } from "../types";
import { CommentsExample } from "./setup";

const example: Example = {
  name: "Comments",
  description:
    "TextEditor whose selections add comments to a CommentsProvider that aggregates them per-doc.",
  component: CommentsExample,
};

export default example;
