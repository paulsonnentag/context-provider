import type { Component as SolidComponent } from "solid-js";
import { Repo } from "@automerge/automerge-repo";
import "../../core/patchwork-view";
import { createRepoProvider } from "../../core/createRepoProvider";
import type { CounterDoc } from "../Counter/Counter";
import { SpatialCanvas, type CanvasDoc } from "./SpatialCanvas";

const repo = new Repo({});
const RepoProvider = createRepoProvider(repo);

const counterA = repo.create<CounterDoc>({ count: 0 });
const counterB = repo.create<CounterDoc>({ count: 0 });

const canvas = repo.create<CanvasDoc>({
  shapes: {
    a: {
      type: "counter",
      x: 40,
      y: 40,
      width: 180,
      height: 100,
      zIndex: 1,
      url: counterA.url,
    },
    b: {
      type: "counter",
      x: 260,
      y: 140,
      width: 180,
      height: 100,
      zIndex: 2,
      url: counterB.url,
    },
  },
});

export const SpatialCanvasExample: SolidComponent = () => (
  <patchwork-view prop:component={RepoProvider}>
    <patchwork-view prop:component={SpatialCanvas} url={canvas.url} />
  </patchwork-view>
);
