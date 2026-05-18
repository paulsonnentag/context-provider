import type { Component as SolidComponent } from "solid-js";
import { Repo } from "@automerge/automerge-repo";
import "../../core/patchwork-view";
import { createRepoProvider } from "../../core/createRepoProvider";
import { CommentsProvider } from "../../providers/Comments";
import { TextEditor, type TextDoc } from "../../components/TextEditor/TextEditor";

const repo = new Repo({});
const RepoProvider = createRepoProvider(repo);

const textUrl = repo.create<TextDoc>({
  text: [
    "Select any sentence in this editor and click the comment button that",
    "appears in the right gutter — it'll be stored under @patchwork.comments",
    "inside this Automerge document, and surfaced via the CommentsProvider.",
    "",
    "The provider watches patchwork:mount / patchwork:unmount events from",
    "descendant <patchwork-view> elements to know which docs to aggregate.",
  ].join("\n"),
}).url;

export const CommentsExample: SolidComponent = () => (
  <patchwork-view prop:component={RepoProvider}>
    <patchwork-view prop:component={CommentsProvider}>
      <patchwork-view prop:component={TextEditor} url={textUrl} />
    </patchwork-view>
  </patchwork-view>
);
