import type { AutomergeUrl } from "@automerge/automerge-repo";
import { StateHandle } from "@/core/handles";
import { subscribeToDocsIn } from "@/core/subscribeToDocsIn";
import { respond } from "@/core/provider";
import type { Component, RequestEvent, Selector } from "@/core/types";

export type Location = {
  name: string;
  lat: number;
  lng: number;
};

type TextDocLike = { text?: string };

// Duplicated from mentionRenderer.ts: matches `[label]({"lat":..,"lng":..})`
// tokens that the TextEditor's @-mention autocomplete inserts.
const MENTION_RE = /\[([^\]\n]+)\]\((\{[^}\n]*\})\)/g;

const parseLocations = (text: string | undefined): Location[] => {
  if (!text) return [];
  const out: Location[] = [];
  MENTION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(text))) {
    try {
      const parsed = JSON.parse(m[2]) as Partial<Location>;
      if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number") {
        continue;
      }
      out.push({ name: m[1], lat: parsed.lat, lng: parsed.lng });
    } catch {
      // skip malformed payloads
    }
  }
  return out;
};

export const Locations: Selector = { type: "locations" };

export const isLocationsSelector = (s: Selector): boolean =>
  s.type === Locations.type;

// One-way: parses location tokens out of every text doc mounted in scope and
// exposes the deduped flat list via a Handle<Location[]>. Consumers (e.g.
// MapView) get the array without learning which doc each location came from.
//
// Reactivity model is intentionally dumb: every time `docsHandle` emits a
// change (which already fans in every mounted doc's change events via the
// mount system in StateHandle), we re-parse from scratch against the live
// snapshot. No per-doc cache to keep in sync, no listener-ordering races.
export const GeolocationProvider: Component = async (element) => {
  element.style.display = "contents";

  const locationsHandle = new StateHandle<Location[]>([]);
  const docsHandle = subscribeToDocsIn<TextDocLike>(element);

  const recompute = () => {
    const seen = new Set<string>();
    const next: Location[] = [];
    for (const doc of Object.values(docsHandle.value)) {
      for (const loc of parseLocations(doc.text)) {
        const key = `${loc.lat},${loc.lng},${loc.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(loc);
      }
    }
    locationsHandle.change((s) => {
      s.splice(0, s.length, ...next);
    });
  };

  docsHandle.on("change", recompute);
  recompute();

  const onRequest = (event: RequestEvent) => {
    if (!isLocationsSelector(event.detail.selector)) return;
    event.stopPropagation();
    respond(event, locationsHandle);
  };
  element.addEventListener("patchwork:request", onRequest);

  return () => {
    docsHandle.off("change", recompute);
    docsHandle.destroy();
    element.removeEventListener("patchwork:request", onRequest);
    locationsHandle.change((s) => {
      s.splice(0, s.length);
    });
  };
};
