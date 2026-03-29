export type IncidentStatus = "active" | "contained" | "controlled" | "out";
export type IncidentType = "wildfire" | "prescribed" | "structure" | "other";

export interface Incident {
  id: string;
  name: string;
  type: IncidentType;
  status: IncidentStatus;
  location: string;
  startDate: string;
  acres?: number;
  containment?: number;
  notes?: string;
}

const STATUS_LABELS: Record<IncidentStatus, string> = {
  active: "Active",
  contained: "Contained",
  controlled: "Controlled",
  out: "Out",
};

const TYPE_LABELS: Record<IncidentType, string> = {
  wildfire: "Wildfire",
  prescribed: "Prescribed Burn",
  structure: "Structure Fire",
  other: "Other",
};

export { STATUS_LABELS, TYPE_LABELS };

// Simple in-memory store for now
let incidents: Incident[] = [
  {
    id: "1",
    name: "Eagle Creek Fire",
    type: "wildfire",
    status: "active",
    location: "Eagle Creek Canyon, OR",
    startDate: "2026-03-25",
    acres: 1200,
    containment: 35,
  },
  {
    id: "2",
    name: "Pine Ridge Rx",
    type: "prescribed",
    status: "contained",
    location: "Pine Ridge NF, MT",
    startDate: "2026-03-20",
    acres: 450,
    containment: 100,
  },
  {
    id: "3",
    name: "Summit Blaze",
    type: "wildfire",
    status: "active",
    location: "Summit County, CO",
    startDate: "2026-03-28",
    acres: 80,
    containment: 10,
  },
];

export function getIncidents(): Incident[] {
  return [...incidents];
}

export function getIncident(id: string): Incident | undefined {
  return incidents.find((i) => i.id === id);
}

export function createIncident(data: Omit<Incident, "id">): Incident {
  const incident: Incident = { ...data, id: crypto.randomUUID() };
  incidents = [incident, ...incidents];
  return incident;
}
