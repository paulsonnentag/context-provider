import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  type Component,
} from "solid-js";
import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";

export type Language = "tsx" | "ts" | "css";

export type SourceFile = {
  path: string;
  label: string;
  language: Language;
  code: string;
};

export type SourcesByPath = Record<
  string,
  { code: string; language: Language }
>;

type Tab = SourceFile & { pinned: boolean };

function resolveImport(
  fromFile: string,
  spec: string,
  sources: SourcesByPath
): string | undefined {
  let base: string;
  if (spec.startsWith("@/")) {
    base = spec.slice(2);
  } else if (spec.startsWith(".")) {
    const dir = fromFile.split("/").slice(0, -1).join("/");
    const parts = (dir ? dir.split("/") : []).concat(spec.split("/"));
    const stack: string[] = [];
    for (const p of parts) {
      if (p === "" || p === ".") continue;
      if (p === "..") stack.pop();
      else stack.push(p);
    }
    base = stack.join("/");
  } else {
    return undefined;
  }
  const candidates = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    `${base}.css`,
    `${base}/index.tsx`,
    `${base}/index.ts`,
  ];
  return candidates.find((c) => c in sources);
}

const STRING_TOKEN_RE =
  /<span class="token string">(["'])([^"'<>]+)\1<\/span>/g;

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function linkifyImports(
  html: string,
  fromFile: string,
  sources: SourcesByPath
): string {
  return html.replace(STRING_TOKEN_RE, (full, quote, spec) => {
    if (!spec.startsWith("@/") && !spec.startsWith(".")) return full;
    const target = resolveImport(fromFile, spec, sources);
    if (!target) return full;
    return (
      `<button type="button" class="code-import" data-target="${escapeAttr(target)}" title="Open ${escapeAttr(target)}">` +
      `<span class="token string">${quote}${spec}${quote}</span>` +
      `</button>`
    );
  });
}

export const CodeViewer: Component<{
  pinnedFiles: SourceFile[];
  sourcesByPath: SourcesByPath;
}> = (props) => {
  const [tabs, setTabs] = createSignal<Tab[]>([]);
  const [activeIdx, setActiveIdx] = createSignal(0);

  createEffect(() => {
    const pinned: Tab[] = props.pinnedFiles.map((f) => ({ ...f, pinned: true }));
    setTabs(pinned);
    setActiveIdx(0);
  });

  const active = createMemo<Tab | undefined>(() => {
    const list = tabs();
    if (list.length === 0) return undefined;
    return list[Math.min(activeIdx(), list.length - 1)];
  });

  const html = createMemo(() => {
    const f = active();
    if (!f) return "";
    const grammar = Prism.languages[f.language] ?? Prism.languages.javascript;
    const raw = Prism.highlight(f.code, grammar, f.language);
    return linkifyImports(raw, f.path, props.sourcesByPath);
  });

  function navigate(target: string) {
    const list = tabs();
    const idx = list.findIndex((t) => t.path === target);
    if (idx >= 0) {
      setActiveIdx(idx);
      return;
    }
    const entry = props.sourcesByPath[target];
    if (!entry) return;
    const label = target.split("/").pop() ?? target;
    setTabs([
      ...list,
      {
        path: target,
        label,
        language: entry.language,
        code: entry.code,
        pinned: false,
      },
    ]);
    setActiveIdx(list.length);
  }

  function closeTab(i: number) {
    const list = tabs();
    const t = list[i];
    if (!t || t.pinned) return;
    setTabs(list.filter((_, j) => j !== i));
    setActiveIdx((prev) => {
      if (prev === i) return Math.max(0, i - 1);
      if (prev > i) return prev - 1;
      return prev;
    });
  }

  function handlePreClick(e: MouseEvent) {
    const target = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      ".code-import"
    );
    if (!target) return;
    const path = target.dataset.target;
    if (path) navigate(path);
  }

  return (
    <div class="code-viewer">
      <div class="code-tabs" role="tablist">
        <For each={tabs()}>
          {(tab, i) => (
            <div
              class="code-tab"
              classList={{ active: i() === activeIdx() }}
            >
              <button
                type="button"
                role="tab"
                class="code-tab-label"
                title={tab.path}
                onClick={() => setActiveIdx(i())}
              >
                {tab.label}
              </button>
              <Show when={!tab.pinned}>
                <button
                  type="button"
                  class="code-tab-close"
                  aria-label={`Close ${tab.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(i());
                  }}
                >
                  ×
                </button>
              </Show>
            </div>
          )}
        </For>
      </div>
      <pre
        class={`code-pre language-${active()?.language ?? "tsx"}`}
        onClick={handlePreClick}
      >
        <code innerHTML={html()} />
      </pre>
    </div>
  );
};
