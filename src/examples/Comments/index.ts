import type { Example } from "@/examples/types";
import { CommentsExample } from "./setup";

const example: Example = {
  name: "Comments",
  description:
    "Two text documents on a canvas. Their comments stream into a shared sidebar via CommentsProvider.",
  component: CommentsExample,
};

export default example;
