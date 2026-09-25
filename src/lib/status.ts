/**
 * Charger status vocabulary shared by badges, list rails and map pins.
 * DB values stay the same (available | occupied | maintenance | offline);
 * only the words shown to people and the colors live here.
 */
export type ChargerStatus = "available" | "occupied" | "maintenance" | "offline";

type StatusMeta = {
  label: string;
  /** Text + tinted background for badges */
  badge: string;
  /** Solid dot / rail color */
  dot: string;
  /** Left rail on rows and cards */
  rail: string;
};

export const chargerStatus: Record<ChargerStatus, StatusMeta> = {
  available: {
    label: "Livre",
    badge: "bg-status-available/12 text-status-available border-status-available/25",
    dot: "bg-status-available",
    rail: "before:bg-status-available",
  },
  occupied: {
    label: "Em uso",
    badge: "bg-status-busy/12 text-status-busy border-status-busy/25",
    dot: "bg-status-busy",
    rail: "before:bg-status-busy",
  },
  maintenance: {
    label: "Manutenção",
    badge: "bg-status-maintenance/14 text-status-maintenance border-status-maintenance/30",
    dot: "bg-status-maintenance",
    rail: "before:bg-status-maintenance",
  },
  offline: {
    label: "Indisponível",
    badge: "bg-status-offline/12 text-status-offline border-status-offline/25",
    dot: "bg-status-offline",
    rail: "before:bg-status-offline",
  },
};

export const statusMeta = (status: string): StatusMeta =>
  chargerStatus[status as ChargerStatus] ?? chargerStatus.offline;

/** Classes for a 3px status rail on the left edge of a row or card (needs `relative`). */
export const statusRail = (status: string) =>
  `before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full ${statusMeta(status).rail}`;
