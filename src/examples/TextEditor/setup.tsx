import type { Component as SolidComponent } from "solid-js";
import { Repo } from "@automerge/automerge-repo";
import { PatchworkView } from "../../core/PatchworkView";
import { createRepoProvider } from "../../core/createRepoProvider";
import { TextEditor, type TextDoc } from "./TextEditor";

const repo = new Repo({});

const RepoProvider = createRepoProvider(repo);

const textUrl = repo.create<TextDoc>({
  text: "Edit me — every keystroke is diffed via automerge.updateText().",
}).url;

export const TextEditorExample: SolidComponent = () => (
  <PatchworkView component={RepoProvider}>
    <PatchworkView component={TextEditor} attrs={{ url: textUrl }} />
  </PatchworkView>
);
