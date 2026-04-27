// Standard wildland-engine starter lists for new orgs.
// These are sensible defaults — every item is editable / removable.

export const STARTER_WALKAROUND_ITEMS: string[] = [
  "Engine oil level",
  "Coolant level",
  "Transmission fluid",
  "Power steering fluid",
  "Brake fluid",
  "Tires & pressure (incl. spare)",
  "Lug nuts tight",
  "Lights — headlights, brake, turn",
  "Emergency / warning lights",
  "Wipers & washer fluid",
  "Horn",
  "Mirrors clean & adjusted",
  "Windshield — no cracks",
  "Seat belts functional",
  "Pump primes & holds pressure",
  "Pump packing — no excessive leak",
  "Water tank full",
  "Foam tank topped off",
  "Hose reel works",
  "Discharge & intake valves",
  "Fuel level (truck)",
  "Fuel level (pump motor)",
  "Battery terminals clean & tight",
  "Belts & hoses — no fraying",
  "Exhaust system intact",
  "First aid kit stocked",
  "Fire extinguisher charged",
  "Cab clean & free of loose gear",
];

export const STARTER_INVENTORY_ITEMS: string[] = [
  // Hose & nozzles
  "1\" forestry hose (×6 lengths)",
  "1.5\" attack hose (×4 lengths)",
  "Nozzles — forestry & combination",
  "Hose clamps",
  "Spanner wrenches",
  "Gated wye",
  "Reducers / increasers",
  "Foam eductor / proportioner",
  // Hand tools
  "Pulaski",
  "Combi tool",
  "McLeod",
  "Shovel (×2)",
  "Chainsaw",
  "Chainsaw fuel & bar oil",
  "Chainsaw chaps",
  "Wedges & files",
  "Drip torch",
  "Drip torch fuel",
  "Fusees",
  // PPE
  "Fire shelters (one per crew)",
  "Hard hats",
  "Goggles",
  "Leather gloves",
  "Nomex shirts/pants spare",
  "Headlamps + spare batteries",
  // Comms / nav
  "Radios + spare batteries",
  "Radio chargers",
  "Programming cable",
  "Maps / IRPG",
  "Compass",
  // Medical / safety
  "Trauma kit / IFAK",
  "Eye wash",
  "Sunscreen & lip balm",
  "Electrolytes",
  // Camp / sustainment
  "Drinking water (5+ gal)",
  "MREs / snacks (24 hr)",
  "Sleeping bag & pad",
  "Tent or bivy",
  // Vehicle support
  "Tow strap",
  "Jumper cables",
  "Tire chains",
  "Wheel chocks",
  "Reflective triangles",
  "Spare fuses & bulbs",
];

export type StarterListType = "walkaround" | "inventory";

export function getStarterItems(type: StarterListType): string[] {
  return type === "walkaround" ? STARTER_WALKAROUND_ITEMS : STARTER_INVENTORY_ITEMS;
}

export function getStarterTemplateName(type: StarterListType): string {
  return type === "walkaround" ? "Standard Walk-Around" : "Standard Inventory";
}
