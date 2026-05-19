import type { Example } from "@/examples/types";
import { HelloUserExample } from "./setup";

const example: Example = {
  name: "Hello User",
  description: "Read account state from a provider via request().",
  component: HelloUserExample,
};

export default example;
