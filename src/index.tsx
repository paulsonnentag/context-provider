import { createMemo, createSignal, For, Show } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import HelloUser from "@/examples/HelloUser";
import Counter from "@/examples/Counter";
import Comments from "@/examples/Comments";
import type { Example } from "@/examples/types";
import {
  CodeViewer,
  type Language,
  type SourceFile,
  type SourcesByPath,
} from "@/CodeViewer";
import "@/styles.css";

const rawSources = import.meta.glob("./**/*.{ts,tsx,css}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const sourcesByPath: SourcesByPath = {};
for (const [full, code] of Object.entries(rawSources)) {
  const path = full.replace(/^\.\//, "");
  const ext = path.split(".").pop();
  if (ext !== "ts" && ext !== "tsx" && ext !== "css") continue;
  sourcesByPath[path] = { code, language: ext as Language };
}

const pinnedByFolder: Record<string, SourceFile[]> = {};
for (const [path, entry] of Object.entries(sourcesByPath)) {
  if (!path.startsWith("examples/")) continue;
  const rel = path.slice("examples/".length);
  const [folder, file, ...rest] = rel.split("/");
  if (!folder || !file || rest.length) continue;
  if (file === "index.ts") continue;
  (pinnedByFolder[folder] ??= []).push({
    path,
    label: file,
    language: entry.language,
    code: entry.code,
  });
}
for (const list of Object.values(pinnedByFolder)) {
  list.sort((a, b) => {
    if (a.label === "setup.tsx") return -1;
    if (b.label === "setup.tsx") return 1;
    return a.label.localeCompare(b.label);
  });
}

type Entry = { example: Example; folder: string };

const examples: Entry[] = [
  { example: HelloUser, folder: "HelloUser" },
  { example: Counter, folder: "Counter" },
  { example: Comments, folder: "Comments" },
];

const App = () => {
  const [activeIdx, setActiveIdx] = createSignal(0);
  const [tab, setTab] = createSignal<"demo" | "code">("demo");

  const active = () => examples[activeIdx()].example;
  const activeFolder = () => examples[activeIdx()].folder;
  const activePinned = createMemo<SourceFile[]>(
    () => pinnedByFolder[activeFolder()] ?? []
  );

  return (
    <div class="app">
      <aside class="sidebar">
        <nav class="sidebar-nav">
          <For each={examples}>
            {(entry, i) => (
              <button
                type="button"
                class="sidebar-item"
                classList={{ active: i() === activeIdx() }}
                onClick={() => {
                  setActiveIdx(i());
                  setTab("demo");
                }}
              >
                <span class="sidebar-item-name">{entry.example.name}</span>
                <span class="sidebar-item-desc">
                  {entry.example.description}
                </span>
              </button>
            )}
          </For>
        </nav>
      </aside>
      <main class="content">
        <header class="content-header">
          <div class="content-header-row">
            <div class="content-header-text">
              <h1>{active().name}</h1>
              <p>{active().description}</p>
            </div>
            <div class="content-tabs" role="tablist">
              <button
                type="button"
                class="content-tab"
                classList={{ active: tab() === "demo" }}
                onClick={() => setTab("demo")}
              >
                Demo
              </button>
              <Show when={activePinned().length > 0}>
                <button
                  type="button"
                  class="content-tab"
                  classList={{ active: tab() === "code" }}
                  onClick={() => setTab("code")}
                >
                  Code
                </button>
              </Show>
            </div>
          </div>
        </header>
        <section
          class="content-stage"
          classList={{ "content-stage--code": tab() === "code" }}
        >
          <Show
            when={tab() === "demo"}
            fallback={
              <CodeViewer
                pinnedFiles={activePinned()}
                sourcesByPath={sourcesByPath}
              />
            }
          >
            <Dynamic component={active().component} />
          </Show>
        </section>
      </main>
    </div>
  );
};

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

render(() => <App />, root);
