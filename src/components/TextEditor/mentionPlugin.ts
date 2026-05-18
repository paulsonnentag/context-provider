import {
  autocompletion,
  type Completion,
  type CompletionContext,
} from "@codemirror/autocomplete";

type City = { name: string; lat: number; lng: number };

const CITIES: City[] = [
  { name: "Berlin", lat: 52.52, lng: 13.405 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
  { name: "Cairo", lat: 30.0444, lng: 31.2357 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "São Paulo", lat: -23.5505, lng: -46.6333 },
  { name: "Toronto", lat: 43.6532, lng: -79.3832 },
];

function cityMentions(context: CompletionContext) {
  const token = context.matchBefore(/@[\w\sÀ-ÿ.-]*/);
  if (!token) return null;
  if (token.from === token.to && !context.explicit) return null;

  const options: Completion[] = CITIES.map((city) => ({
    label: city.name,
    type: "variable",
    detail: `${city.lat}, ${city.lng}`,
    apply: (view, _completion, from, to) => {
      const payload = JSON.stringify({ lat: city.lat, lng: city.lng });
      const insert = `[${city.name}](${payload}) `;
      // The completion range starts after the '@' (see `from` below) so we
      // expand back by one to also swallow the trigger character.
      const replaceFrom = from - 1;
      view.dispatch({
        changes: { from: replaceFrom, to, insert },
        selection: { anchor: replaceFrom + insert.length },
      });
    },
  }));

  return {
    // Skip the '@' so the dropdown filters against bare city names while the
    // '@' stays in the doc until apply() rewrites the full token.
    from: token.from + 1,
    options,
    validFor: /^[\w\sÀ-ÿ.-]*$/,
  };
}

export const mentionPlugin = () =>
  autocompletion({
    override: [cityMentions],
    activateOnTyping: true,
  });
