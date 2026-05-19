import type { Component as SolidComponent } from "solid-js";
import { Repo } from "@automerge/automerge-repo";
import "@/core/patchwork-view";
import { FallbackProvider } from "@/providers/FallbackProvider";
import { RepoProvider } from "@/providers/RepoProvider";
import { GeolocationProvider } from "@/providers/Geolocation";
import {
  SpatialCanvas,
  type CanvasDoc,
} from "@/components/SpatialCanvas/SpatialCanvas";
import type { TextDoc } from "@/components/TextEditor/TextEditor";

const repo = new Repo({});
const repoProvider = RepoProvider(repo);

const europeUrl = repo.create<TextDoc>({
  text:
    "Plan A: A few days in Europe\n\n" +
    'Maybe I\'ll start in [Berlin]({"lat":52.52,"lng":13.405}) and see what there is to do there. If I have time, I might head somewhere else nearby. \n\n\n You can type @ to add another city idea.',
}).url;

const worldUrl = repo.create<TextDoc>({
  text:
    "Plan B: North America\n\n" +
    'I could fly to [New York]({"lat":40.7128,"lng":-74.006}) and then catch the train up to [Toronto]({"lat":43.6532,"lng":-79.3832}) for a change of scene.',
}).url;

const canvasUrl = repo.create<CanvasDoc>({
  shapes: {
    a: {
      type: "text",
      x: 48,
      y: 48,
      width: 460,
      height: 320,
      zIndex: 1,
      url: europeUrl,
    },
    b: {
      type: "text",
      x: 48,
      y: 400,
      width: 460,
      height: 320,
      zIndex: 2,
      url: worldUrl,
    },
    c: {
      type: "map",
      x: 540,
      y: 48,
      width: 560,
      height: 672,
      zIndex: 3,
    },
  },
}).url;

export const EmbarkExample: SolidComponent = () => (
  <patchwork-view prop:component={FallbackProvider}>
    <patchwork-view prop:component={repoProvider}>
      <div class="embark-example">
        <patchwork-view prop:component={GeolocationProvider}>
          <patchwork-view prop:component={SpatialCanvas} url={canvasUrl} />
        </patchwork-view>
      </div>
    </patchwork-view>
  </patchwork-view>
);
