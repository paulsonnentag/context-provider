import type { Component as SolidComponent } from "solid-js";
import { Repo } from "@automerge/automerge-repo";
import "../../core/patchwork-view";
import { createRepoProvider } from "../../core/createRepoProvider";
import { Todo, type TodoDoc } from "./Todo";

const repo = new Repo({});

const RepoProvider = createRepoProvider(repo);

const todoUrl = repo.create<TodoDoc>({
  todos: [
    { id: "seed-1", text: "Read the README", completed: true },
    { id: "seed-2", text: "Try the Counter example", completed: false },
    { id: "seed-3", text: "Add a todo of your own", completed: false },
  ],
}).url;

export const TodoExample: SolidComponent = () => (
  <patchwork-view prop:component={RepoProvider}>
    <patchwork-view prop:component={Todo} url={todoUrl} />
  </patchwork-view>
);
