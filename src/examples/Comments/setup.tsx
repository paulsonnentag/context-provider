import type { Component as SolidComponent } from "solid-js";
import { Repo, type AutomergeUrl } from "@automerge/automerge-repo";
import "../../core/patchwork-view";
import { createRepoProvider } from "../../core/createRepoProvider";
import { MapHandle } from "../../core/handles";
import {
  CommentsProvider,
  CommentsSidebar,
  type Comment,
} from "../../providers/Comments";
import { SpatialCanvas, type CanvasDoc } from "../../components/SpatialCanvas/SpatialCanvas";
import type { TextDoc } from "../../components/TextEditor/TextEditor";

const repo = new Repo({});
const RepoProvider = createRepoProvider(repo);

const docAUrl = repo.create<TextDoc>({
  text: [
    "Document A.",
    "Select a sentence and click the comment button that appears in the",
    "right gutter — the comment is stored under @patchwork.comments inside",
    "this document.",
  ].join("\n"),
}).url;

const docBUrl = repo.create<TextDoc>({
  text: [
    "Document B.",
    "A second text document sharing the same canvas. Comments added here",
    "land in B's @patchwork.comments and stream into the sidebar alongside",
    "A's, grouped by url.",
  ].join("\n"),
}).url;

const canvasUrl = repo.create<CanvasDoc>({
  shapes: {
    a: {
      type: "text",
      x: 32,
      y: 32,
      width: 360,
      height: 240,
      zIndex: 1,
      url: docAUrl,
    },
    b: {
      type: "text",
      x: 440,
      y: 120,
      width: 360,
      height: 240,
      zIndex: 2,
      url: docBUrl,
    },
  },
}).url;

export const CommentsExample: SolidComponent = () => {
  // Shared aggregate: CommentsProvider populates it, CommentsSidebar reads it.
  const commentsMap = new MapHandle<AutomergeUrl, Comment[]>();

  return (
    <patchwork-view prop:component={RepoProvider}>
      <div class="comments-example">
        <patchwork-view
          prop:component={CommentsProvider}
          prop:handle={commentsMap}
        >
          <patchwork-view prop:component={SpatialCanvas} url={canvasUrl} />
        </patchwork-view>
        <patchwork-view
          prop:component={CommentsSidebar}
          prop:handle={commentsMap}
        />
      </div>
    </patchwork-view>
  );
};
