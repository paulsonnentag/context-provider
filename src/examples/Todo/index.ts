import type { Example } from "../types";
import { TodoExample } from "./setup";

const example: Example = {
  name: "Todo",
  description:
    "Automerge-backed todo list with add, toggle, and clear-completed actions.",
  component: TodoExample,
};

export default example;
