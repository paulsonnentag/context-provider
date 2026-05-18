import type { Component as SolidComponent } from "solid-js";
import { Repo } from "@automerge/automerge-repo";
import "../../core/patchwork-view";
import { createRepoProvider } from "../../core/createRepoProvider";
import { Counter, type CounterDoc } from "./Counter";

const repo = new Repo({});

const RepoProvider = createRepoProvider(repo);

const counterUrl = repo.create<CounterDoc>({ count: 0 }).url;

export const CounterExample: SolidComponent = () => (
  <patchwork-view prop:component={RepoProvider}>
    <patchwork-view prop:component={Counter} url={counterUrl} />
  </patchwork-view>
);
