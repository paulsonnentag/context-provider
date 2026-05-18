import type { Component as SolidComponent } from "solid-js";
import { Repo } from "@automerge/automerge-repo";
import "../../core/patchwork-view";
import { createRepoProvider } from "../../core/createRepoProvider";
import { TextEditor, type TextDoc } from "./TextEditor";

const repo = new Repo({});

const RepoProvider = createRepoProvider(repo);

const textUrl = repo.create<TextDoc>({
  text: [
    "This is a CodeMirror editor wired to an Automerge document through",
    "@automerge/automerge-codemirror — every edit syncs as a splice.",
    "",
    "Select any text and a comment button appears in the right gutter; clicking",
    "it logs an Automerge cursor pair for the selection to the console.",
    "",
    "Type @ anywhere to open a city autocomplete — try @ber or @new — and",
    "navigate with the arrow keys, mouse, or Tab / Enter to insert.",
  ].join("\n"),
}).url;

export const TextEditorExample: SolidComponent = () => (
  <patchwork-view prop:component={RepoProvider}>
    <patchwork-view prop:component={TextEditor} url={textUrl} />
  </patchwork-view>
);
