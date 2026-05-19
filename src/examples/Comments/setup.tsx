import type { Component as SolidComponent } from "solid-js";
import { Repo, type AutomergeUrl } from "@automerge/automerge-repo";
import { getCursor } from "@automerge/automerge";
import "@/core/patchwork-view";
import { StateHandle } from "@/core/handles";
import { FallbackProvider } from "@/providers/FallbackProvider";
import { RepoProvider } from "@/providers/RepoProvider";
import {
  CommentsProvider,
  CommentsSidebar,
  type Comment,
  type PatchworkMetadata,
} from "@/providers/Comments";
import {
  SpatialCanvas,
  type CanvasDoc,
} from "@/components/SpatialCanvas/SpatialCanvas";
import type { TextDoc } from "@/components/TextEditor/TextEditor";

const repo = new Repo({});
const repoProvider = RepoProvider(repo);

const puffinsText =
  "Atlantic puffins are small, stocky seabirds that spend most of their lives bobbing on the open ocean and only come ashore each spring to breed on cliff-top colonies in the North Atlantic.\n\n" +
  'Their black-and-white plumage and oversized, candy-striped beaks have earned them the nickname "clowns of the sea" — but that beak is also a remarkably good fishing tool: backward-facing spines on a puffin\'s tongue and palate let it pin one slippery fish in place while it dives again, so a single bird can return to its burrow with a dozen sand eels still dangling crosswise in its mouth.';

const docAHandle = repo.create<TextDoc & PatchworkMetadata>({
  text: puffinsText,
  "@patchwork": { title: "Puffins" },
});
const docAUrl = docAHandle.url;

// Seed an existing comment so the example demonstrates the read-mode UI on
// load (highlight in the editor + content in the sidebar).
{
  const phrase = "candy-striped beaks";
  const from = puffinsText.indexOf(phrase);
  if (from !== -1) {
    const to = from + phrase.length;
    docAHandle.change((d) => {
      const startCursor = getCursor(d, ["text"], from);
      const endCursor = getCursor(d, ["text"], to);
      if (!d["@patchwork"]) d["@patchwork"] = {};
      d["@patchwork"].comments = [
        {
          id: "seed-puffins-1",
          target: { startCursor, endCursor },
          snippet: phrase,
          content: "Pretty striking — the bill is actually only this colorful during breeding season.",
          createdAt: Date.now(),
        },
      ];
    });
  }
}

const docBUrl = repo.create<TextDoc & PatchworkMetadata>({
  text:
    "The American robin is one of the most familiar birds across North America — a grey-backed thrush with a brick-red breast and a clear, rolling dawn song.\n\n" +
    "Robins forage on lawns for earthworms in the cool of morning and switch to berries later in the day, which is part of how they manage to migrate so far. To stay on course they appear to do something stranger than navigation by landmarks: light-sensitive pigments in their eyes react to Earth's magnetic field, effectively giving them a faint compass overlay on whatever they happen to be looking at.",
  "@patchwork": { title: "Robins" },
}).url;

const canvasUrl = repo.create<CanvasDoc>({
  shapes: {
    a: {
      type: "text",
      x: 48,
      y: 48,
      width: 480,
      height: 400,
      zIndex: 1,
      url: docAUrl,
    },
    b: {
      type: "text",
      x: 400,
      y: 200,
      width: 480,
      height: 400,
      zIndex: 2,
      url: docBUrl,
    },
  },
}).url;

export const CommentsExample: SolidComponent = () => {
  const commentsState = new StateHandle<Record<AutomergeUrl, Comment[]>>({});

  return (
    <patchwork-view prop:component={FallbackProvider}>
      <patchwork-view prop:component={repoProvider}>
        <div class="comments-example">
          <patchwork-view
            prop:component={CommentsProvider}
            prop:handle={commentsState}
          >
            <patchwork-view prop:component={SpatialCanvas} url={canvasUrl} />
          </patchwork-view>
          <patchwork-view
            prop:component={CommentsSidebar}
            prop:handle={commentsState}
          />
        </div>
      </patchwork-view>
    </patchwork-view>
  );
};
