import { supabase } from "@/integrations/supabase/client";

export const BRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(v) ? v : 0);

export const num = (v: unknown, d = 0) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : d;
};

/** Haversine distance in km */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Rough driving time in minutes (urban avg 26 km/h) */
export const driveMinutes = (km: number) => Math.max(1, Math.round((km / 26) * 60));

export const formatKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

export function chargeMinutes(targetKwh: number, powerKw: number) {
  if (powerKw <= 0) return 0;
  return Math.round((targetKwh / powerKw) * 60);
}

export const SAO_PAULO = { lat: -23.5613, lng: -46.656 };

export const statusLabel: Record<string, string> = {
  available: "Disponível",
  occupied: "Ocupado",
  offline: "Offline",
  maintenance: "Manutenção",
};

export const statusTone: Record<string, string> = {
  available: "bg-success/15 text-success border-success/30",
  occupied: "bg-warning/15 text-warning border-warning/30",
  offline: "bg-muted text-muted-foreground border-border",
  maintenance: "bg-primary/15 text-primary border-primary/30",
};

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Uploads a file to a private bucket and returns a long-lived signed URL. */
export async function uploadImage(bucket: "avatars" | "charger-photos", userId: string, file: File) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(path, TEN_YEARS);
  if (signErr) throw signErr;
  return data.signedUrl;
}

export function toCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h] ?? "")).join(","))].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
