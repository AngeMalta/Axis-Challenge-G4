/**
 * Built-in images for chargers. Every charger must show a picture: merchants can
 * upload their own or pick one of these, and chargers saved without any image get
 * a random one. They are self-contained SVG data URIs, so they never break and
 * can be stored in `chargers.photos` like any uploaded URL.
 */

type Scene = {
  id: string;
  label: string;
  sky: [string, string];
  ground: string;
  body: string;
  shade: string;
  accent: string;
  screen: string;
  car: string;
  backdrop: string;
  foreground?: string;
};

// Lightning bolt centred on (0, 0), about 24x44.
const BOLT = "M2 -22 L-12 4 H-1 L-4 22 L12 -6 H1 Z";

function charger(cx: number, s: Scene) {
  return `
  <rect x="${cx - 78}" y="458" width="156" height="18" rx="8" fill="#000" opacity="0.18"/>
  <rect x="${cx - 60}" y="200" width="120" height="266" rx="20" fill="${s.body}"/>
  <path d="M${cx - 60} 240 V220 a20 20 0 0 1 20 -20 H${cx + 40} a20 20 0 0 1 20 20 V240 Z" fill="${s.accent}"/>
  <rect x="${cx - 60}" y="236" width="120" height="6" fill="${s.shade}" opacity="0.35"/>
  <rect x="${cx - 42}" y="266" width="84" height="66" rx="10" fill="${s.screen}"/>
  <path d="${BOLT}" transform="translate(${cx} 299)" fill="${s.accent}"/>
  <rect x="${cx - 42}" y="350" width="84" height="8" rx="4" fill="${s.shade}" opacity="0.4"/>
  <rect x="${cx - 42}" y="366" width="56" height="8" rx="4" fill="${s.shade}" opacity="0.4"/>
  <rect x="${cx + 58}" y="300" width="20" height="56" rx="7" fill="${s.shade}"/>
  <path d="M${cx + 68} 356 C ${cx + 72} 440, ${cx + 150} 470, ${cx + 200} 420" fill="none" stroke="${s.shade}" stroke-width="9" stroke-linecap="round"/>`;
}

function car(x: number, color: string) {
  return `
  <ellipse cx="${x + 150}" cy="470" rx="170" ry="12" fill="#000" opacity="0.16"/>
  <path d="M${x} 440 V405 q0 -18 18 -22 l52 -10 l48 -46 q10 -9 24 -9 h92 q16 0 26 11 l40 44 l36 8 q20 5 20 26 V440 q0 12 -12 12 H${x + 12} q-12 0 -12 -12 Z" fill="${color}"/>
  <path d="M${x + 86} 373 l36 -34 q6 -5 14 -5 h40 v39 Z" fill="#fff" opacity="0.55"/>
  <path d="M${x + 186} 334 h36 q10 0 16 7 l30 32 h-82 Z" fill="#fff" opacity="0.55"/>
  <circle cx="${x + 70}" cy="452" r="30" fill="#1f2328"/>
  <circle cx="${x + 70}" cy="452" r="12" fill="#c9ced6"/>
  <circle cx="${x + 244}" cy="452" r="30" fill="#1f2328"/>
  <circle cx="${x + 244}" cy="452" r="12" fill="#c9ced6"/>
  <rect x="${x + 290}" y="398" width="16" height="8" rx="4" fill="#ffe08a"/>`;
}

function render(s: Scene) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.sky[0]}"/><stop offset="1" stop-color="${s.sky[1]}"/></linearGradient></defs>
  <rect width="800" height="600" fill="url(#sky)"/>
  ${s.backdrop}
  <rect y="430" width="800" height="170" fill="${s.ground}"/>
  ${s.foreground ?? ""}
  ${charger(300, s)}
  ${car(430, s.car)}
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, " "))}`;
}

// Building windows as a repeating pattern (every third one dark) keeps the SVG small.
const windowPattern = (lit: string) =>
  `<defs><pattern id="win" width="66" height="26" patternUnits="userSpaceOnUse"><rect x="0" y="0" width="12" height="14" fill="${lit}"/><rect x="22" y="0" width="12" height="14" fill="#26324a"/><rect x="44" y="0" width="12" height="14" fill="${lit}"/></pattern></defs>`;
const windows = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#win)"/>`;

const scenes: Scene[] = [
  {
    id: "comercio-dia",
    label: "Comércio de dia",
    sky: ["#bfe3ff", "#eef7ff"],
    ground: "#c9ccd1",
    body: "#ffffff",
    shade: "#5b6472",
    accent: "#e5322d",
    screen: "#1d2533",
    car: "#3a7bd5",
    backdrop: `<circle cx="660" cy="110" r="46" fill="#ffd45c"/>
      <g fill="#fff"><ellipse cx="180" cy="110" rx="70" ry="24"/><ellipse cx="230" cy="96" rx="46" ry="26"/><ellipse cx="520" cy="170" rx="56" ry="18"/></g>
      <rect x="40" y="300" width="220" height="130" fill="#f3d9b1"/><rect x="40" y="290" width="220" height="22" fill="#e5322d"/>
      <rect x="70" y="340" width="70" height="90" fill="#8fb8de"/><rect x="160" y="340" width="70" height="60" fill="#8fb8de"/>`,
    foreground: `<g fill="#fff" opacity="0.7"><rect x="0" y="520" width="90" height="10"/><rect x="150" y="520" width="90" height="10"/><rect x="300" y="520" width="90" height="10"/><rect x="450" y="520" width="90" height="10"/><rect x="600" y="520" width="90" height="10"/><rect x="750" y="520" width="50" height="10"/></g>`,
  },
  {
    id: "entardecer",
    label: "Entardecer",
    sky: ["#ff9a6b", "#ffd6a0"],
    ground: "#7a5a55",
    body: "#2b2f3a",
    shade: "#11141a",
    accent: "#ffb020",
    screen: "#0d1016",
    car: "#f4f1ec",
    backdrop: `<circle cx="600" cy="400" r="120" fill="#ffe3a3" opacity="0.9"/>
      <path d="M0 430 Q 160 330 320 400 T 640 380 T 800 400 V430 H0 Z" fill="#c9705b"/>
      <path d="M0 430 Q 200 380 420 420 T 800 410 V430 H0 Z" fill="#a4574b"/>`,
  },
  {
    id: "cidade-noite",
    label: "Cidade à noite",
    sky: ["#0f1a33", "#24345a"],
    ground: "#2a2f3b",
    body: "#e9edf3",
    shade: "#39414f",
    accent: "#2fd07a",
    screen: "#0b1220",
    car: "#c0392b",
    backdrop: `${windowPattern("#ffd86b")}<circle cx="120" cy="90" r="30" fill="#f4f1d0"/><circle cx="132" cy="82" r="26" fill="#0f1a33"/>
      <g fill="#1b2744"><rect x="20" y="220" width="130" height="210"/><rect x="170" y="160" width="110" height="270"/><rect x="520" y="200" width="120" height="230"/><rect x="660" y="140" width="130" height="290"/></g>
      ${windows(33, 240, 106, 150)}${windows(187, 180, 80, 230)}${windows(537, 220, 96, 180)}${windows(673, 160, 106, 240)}`,
    foreground: `<ellipse cx="300" cy="470" rx="150" ry="26" fill="#2fd07a" opacity="0.18"/>`,
  },
  {
    id: "garagem",
    label: "Garagem coberta",
    sky: ["#6d737c", "#9aa0a8"],
    ground: "#b4b8be",
    body: "#f7f7f5",
    shade: "#4b525c",
    accent: "#1e88e5",
    screen: "#18202b",
    car: "#2f3640",
    backdrop: `<rect width="800" height="70" fill="#565c65"/>
      <g fill="#fffbe6"><rect x="90" y="70" width="140" height="10" rx="4"/><rect x="330" y="70" width="140" height="10" rx="4"/><rect x="570" y="70" width="140" height="10" rx="4"/></g>
      <g fill="#fffbe6" opacity="0.12"><path d="M90 80 L40 430 H280 L230 80 Z"/><path d="M570 80 L520 430 H760 L710 80 Z"/></g>
      <rect x="0" y="300" width="800" height="16" fill="#f2c94c"/><rect x="0" y="316" width="800" height="16" fill="#1f2328" opacity="0.25"/>`,
    foreground: `<g fill="#fff" opacity="0.8"><rect x="200" y="430" width="10" height="170"/><rect x="780" y="430" width="10" height="170"/></g>`,
  },
  {
    id: "parque",
    label: "Estacionamento arborizado",
    sky: ["#d7f0e1", "#f4fbf6"],
    ground: "#9fb7a4",
    body: "#ffffff",
    shade: "#44614e",
    accent: "#18a058",
    screen: "#16261c",
    car: "#f39c12",
    backdrop: `<g fill="#6a8f5c"><rect x="92" y="330" width="16" height="100"/><rect x="662" y="310" width="16" height="120"/><rect x="522" y="350" width="12" height="80"/></g>
      <g fill="#3f8a4f"><circle cx="100" cy="300" r="62"/><circle cx="60" cy="330" r="40"/><circle cx="670" cy="270" r="72"/><circle cx="720" cy="310" r="44"/><circle cx="528" cy="330" r="40"/></g>
      <g fill="#fff"><ellipse cx="330" cy="100" rx="64" ry="20"/><ellipse cx="372" cy="88" rx="40" ry="22"/></g>`,
  },
  {
    id: "eletroposto",
    label: "Eletroposto",
    sky: ["#e6f4f5", "#ffffff"],
    ground: "#d3d7dc",
    body: "#1f6f78",
    shade: "#0f3f45",
    accent: "#ffffff",
    screen: "#0b2a2e",
    car: "#8e44ad",
    backdrop: `<rect x="40" y="96" width="720" height="44" rx="10" fill="#1f6f78"/><rect x="40" y="140" width="720" height="10" fill="#0f3f45" opacity="0.35"/>
      <g fill="#b9c3c9"><rect x="120" y="150" width="18" height="280"/><rect x="662" y="150" width="18" height="280"/></g>
      <path d="M380 112 l-10 14 h8 l-3 12 l12 -16 h-8 z" fill="#fff"/>`,
    foreground: `<rect x="0" y="430" width="800" height="12" fill="#1f6f78" opacity="0.25"/>`,
  },
];

export type ChargerImage = { id: string; label: string; src: string };

export const chargerImages: ChargerImage[] = scenes.map((s) => ({
  id: s.id,
  label: s.label,
  src: render(s),
}));

const sources = new Set(chargerImages.map((img) => img.src));

export const isDefaultChargerImage = (src: string) => sources.has(src);

export function randomChargerImage(): string {
  return chargerImages[Math.floor(Math.random() * chargerImages.length)]!.src;
}

/** Stable pick for a charger with no (or a broken) image, so it doesn't change on every render. */
export function fallbackChargerImage(seed = ""): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return chargerImages[hash % chargerImages.length]!.src;
}

/** First usable photo of a charger, or its fallback image. */
export function chargerCover(photos: string[] | null | undefined, seed?: string): string {
  return photos?.find((p) => p.trim()) ?? fallbackChargerImage(seed);
}
