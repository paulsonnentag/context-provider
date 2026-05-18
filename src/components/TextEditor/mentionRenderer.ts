import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

// Matches `[label]({...})` where the payload is a single JSON object on one
// line. We intentionally don't try to handle nested braces — the inserted
// mentions are always flat `{ "lat": ..., "lng": ... }`.
const MENTION_RE = /\[([^\]\n]+)\]\((\{[^}\n]*\})\)/g;

type Coords = { lat: number; lng: number };

class MentionWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly coords: Coords,
  ) {
    super();
  }

  eq(other: MentionWidget) {
    return (
      other.label === this.label &&
      other.coords.lat === this.coords.lat &&
      other.coords.lng === this.coords.lng
    );
  }

  toDOM() {
    const el = document.createElement("span");
    el.className = "cm-mention";
    el.textContent = this.label;
    el.title = `${this.coords.lat}, ${this.coords.lng}`;
    return el;
  }

  ignoreEvent() {
    return false;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    MENTION_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MENTION_RE.exec(text))) {
      let coords: Coords;
      try {
        const parsed = JSON.parse(match[2]) as Partial<Coords>;
        if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number") continue;
        coords = { lat: parsed.lat, lng: parsed.lng };
      } catch {
        continue;
      }
      const start = from + match.index;
      const end = start + match[0].length;
      builder.add(
        start,
        end,
        Decoration.replace({ widget: new MentionWidget(match[1], coords) }),
      );
    }
  }
  return builder.finish();
}

export const mentionRenderer = () =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of(
          (view) => view.plugin(plugin)?.decorations ?? Decoration.none,
        ),
    },
  );
