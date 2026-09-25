import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapCharger = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  price_per_kwh: number | string;
  photos: string[];
};

const colorFor = (status: string) =>
  status === "available" ? "#22c55e" : status === "occupied" ? "#f59e0b" : "#ef4444";

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );

function pinIcon(c: MapCharger, selected: boolean) {
  const photo = c.photos?.[0];
  const color = colorFor(c.status);
  const size = selected ? 56 : 46;
  return L.divIcon({
    className: "",
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 8],
    html: `<div style="position:relative;width:${size}px;height:${size + 10}px">
      <div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;border:3px solid ${color};box-shadow:0 6px 16px rgba(0,0,0,.35);background:#1a1a1a">
        ${
          photo
            ? `<img src="${escapeHtml(photo)}" alt="" style="width:100%;height:100%;object-fit:cover" />`
            : `<div style="display:grid;place-items:center;width:100%;height:100%;color:${color};font-weight:700">&#9889;</div>`
        }
      </div>
      <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid ${color}"></div>
    </div>`,
  });
}

export default function ChargerMap({
  chargers,
  center,
  userPosition,
  selectedId,
  onSelect,
  routeTo,
}: {
  chargers: MapCharger[];
  center: { lat: number; lng: number };
  userPosition?: { lat: number; lng: number } | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  routeTo?: { lat: number; lng: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true }).setView(
      [center.lat, center.lng],
      13,
    );
    // Top-right keeps zoom clear of the selected-charger card and the chat launcher at the bottom.
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Leaflet measures its container only once; without this the map shows grey
    // gaps after rotation, breakpoint changes or the mobile list/map toggle.
    const observer = new ResizeObserver(() => map.invalidateSize({ debounceMoveend: true }));
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    chargers.forEach((c) => {
      const selected = c.id === selectedId;
      const marker = L.marker([c.latitude, c.longitude], {
        icon: pinIcon(c, selected),
        zIndexOffset: selected ? 1000 : 0,
        title: c.name,
        keyboard: true,
      }).addTo(layer);
      marker.bindTooltip(
        `<b>${escapeHtml(c.name)}</b><br/>R$ ${Number(c.price_per_kwh).toFixed(2)}/kWh`,
        { direction: "top", offset: [0, selected ? -60 : -50] },
      );
      marker.on("click", () => onSelect?.(c.id));
    });

    if (userPosition) {
      L.circleMarker([userPosition.lat, userPosition.lng], {
        radius: 8,
        color: "#fff",
        weight: 3,
        fillColor: "#ef4444",
        fillOpacity: 1,
      })
        .addTo(layer)
        .bindTooltip("Você está aqui", { direction: "top" });
    }

    if (userPosition && routeTo) {
      L.polyline(
        [
          [userPosition.lat, userPosition.lng],
          [routeTo.lat, routeTo.lng],
        ],
        { color: "#ef4444", weight: 4, dashArray: "8 8", opacity: 0.8 },
      ).addTo(layer);
      map.fitBounds(
        L.latLngBounds([userPosition.lat, userPosition.lng], [routeTo.lat, routeTo.lng]).pad(0.35),
      );
    }
  }, [chargers, userPosition, routeTo, onSelect, selectedId]);

  // The user's location usually arrives after the map is created; follow it
  // unless the user is already looking at a charger or a route.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedId || routeTo) return;
    map.setView([center.lat, center.lng], map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const c = chargers.find((x) => x.id === selectedId);
    if (c) map.flyTo([c.latitude, c.longitude], Math.max(map.getZoom(), 15), { duration: 0.6 });
    // Only fly when the selection changes, not on every 20s refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
