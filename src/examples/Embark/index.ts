import type { Example } from "@/examples/types";
import { EmbarkExample } from "./setup";

const example: Example = {
  name: "Embark",
  description:
    "Text docs mention cities as @-tokens; the GeolocationProvider parses them into a flat Location[] that a map shape on the canvas plots.",
  component: EmbarkExample,
};

export default example;
