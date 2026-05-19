import { render } from "solid-js/web";
import maplibregl from "maplibre-gl";
import type { Handle } from "@/core/handles";
import { request } from "@/core/provider";
import type { Component } from "@/core/types";
import { Locations, type Location } from "@/providers/Geolocation";

export const MapView: Component = async (element) => {
  let container!: HTMLDivElement;
  const dispose = render(
    () => <div ref={container} class="map-view" />,
    element,
  );

  const locations = await request<Handle<Location[]>>(element, Locations);
  if (!locations) {
    return () => dispose();
  }

  const map = new maplibregl.Map({
    container,
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [13.388, 52.517],
    zoom: 2.5,
  });

  let markers: maplibregl.Marker[] = [];

  const refresh = () => {
    for (const m of markers) m.remove();
    markers = [];
    const locs = locations.value;
    for (const loc of locs) {
      markers.push(
        new maplibregl.Marker()
          .setLngLat([loc.lng, loc.lat])
          .setPopup(new maplibregl.Popup({ offset: 24 }).setText(loc.name))
          .addTo(map),
      );
    }
    if (locs.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      for (const loc of locs) bounds.extend([loc.lng, loc.lat]);
      map.fitBounds(bounds, { padding: 40, maxZoom: 5, animate: false });
    }
  };

  map.on("load", refresh);
  const onChange = () => {
    if (map.loaded()) refresh();
  };
  locations.on("change", onChange);

  return () => {
    locations.off("change", onChange);
    for (const m of markers) m.remove();
    map.remove();
    dispose();
  };
};
