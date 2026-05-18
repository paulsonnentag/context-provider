import type { Example } from "../types";
import { CounterExample } from "./setup";

const example: Example = {
  name: "Counter",
  description: "In-memory Automerge counter resolved through withHandle.",
  component: CounterExample,
};

export default example;
