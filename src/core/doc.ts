import type { AutomergeUrl } from "@automerge/automerge-repo";
import type { Selector } from "./types";

export type DocSelector = {
  type: "doc";
  url: AutomergeUrl;
};

export const Doc = (url: AutomergeUrl): DocSelector => ({
  type: "doc",
  url,
});

export const isDocSelector = (s: Selector): s is DocSelector =>
  s.type === "doc";
