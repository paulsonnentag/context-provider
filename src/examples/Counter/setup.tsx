import type { Component as SolidComponent } from "solid-js";
import { Repo } from "@automerge/automerge-repo";
import "@/core/patchwork-view";
import { FallbackProvider } from "@/providers/FallbackProvider";
import { RepoProvider } from "@/providers/RepoProvider";
import { Counter, type CounterDoc } from "./Counter";

const repo = new Repo({});

const repoProvider = RepoProvider(repo);

const counterUrl = repo.create<CounterDoc>({ count: 0 }).url;

export const CounterExample: SolidComponent = () => (
  <patchwork-view prop:component={FallbackProvider}>
    <patchwork-view prop:component={repoProvider}>
      <patchwork-view prop:component={Counter} url={counterUrl} />
    </patchwork-view>
  </patchwork-view>
);
