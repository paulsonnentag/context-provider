import type { Component as SolidComponent } from "solid-js";
import { Repo } from "@automerge/automerge-repo";
import { PatchworkView } from "../../core/PatchworkView";
import { createRepoProvider } from "../../core/createRepoProvider";
import { withDocHandle } from "../../core/withDocHandle";
import { Counter, type CounterDoc } from "./Counter";

const repo = new Repo({});

const RepoProvider = createRepoProvider(repo);

const counterUrl = repo.create<CounterDoc>({ count: 0 }).url;

const CounterView = withDocHandle<CounterDoc>(Counter);

export const CounterExample: SolidComponent = () => (
  <PatchworkView component={RepoProvider}>
    <PatchworkView component={CounterView} attrs={{ url: counterUrl }} />
  </PatchworkView>
);
