export type MapPoint = { x: number; y: number };

export type FenceObject = {
  id: string;
  type: "fence";
  shape: "line" | "rect";
  points: MapPoint[];
  style: "wood" | "tape" | "temporary";
  weight: number;
};

export type RoadObject = {
  id: string;
  type: "road";
  points: MapPoint[];
  style: "gravel" | "asphalt";
  width: number;
};

export type HorseObject = {
  id: string;
  type: "horse";
  horseId: string;
  name: string;
  x: number;
  y: number;
};

export type StableMapObject = FenceObject | RoadObject | HorseObject;

export type StableMapDocument = {
  schemaVersion: 1;
  mapId: "main";
  canvas: { width: number; height: number };
  background: { url: string; alt: string };
  objects: StableMapObject[];
};

export type Horse = { id: string; name: string };

export const EMPTY_STABLE_MAP: StableMapDocument = {
  schemaVersion: 1,
  mapId: "main",
  canvas: { width: 1672, height: 941 },
  background: {
    url: "/images/stable-map.png",
    alt: "Ponimetsa talli ja koplite kaart",
  },
  objects: [],
};

export const DEFAULT_HORSES: Horse[] = [
  "Chiaro Diluna",
  "Aaton",
  "Tamador",
  "Arthug",
  "Made You Look",
  "Redy Finn",
  "Laukinuke",
  "Ago",
  "Tekiila",
  "Dorian",
  "Karma",
  "Sirlincia RT",
  "Morris",
  "Deeli",
  "Viktooria",
  "Noora",
  "Leelo",
  "Krahvinna",
].map((name, index) => ({ id: `horse-${index + 1}`, name }));

export function parseStableMapDocument(value: unknown): StableMapDocument {
  if (!value || typeof value !== "object") throw new Error("Kaardi andmed puuduvad");
  const candidate = value as Partial<StableMapDocument>;
  if (!Array.isArray(candidate.objects)) throw new Error("Kaardi objektid puuduvad");

  const canvas = candidate.canvas;
  if (!canvas || canvas.width !== 1672 || canvas.height !== 941) {
    throw new Error("Kaardi mõõtmed ei ole toetatud");
  }

  const objects = candidate.objects.map((object) => {
    if (!object || typeof object !== "object") throw new Error("Vigane kaardi objekt");
    const item = object as StableMapObject;
    if (!item.id || !["fence", "road", "horse"].includes(item.type)) {
      throw new Error("Tundmatu kaardi objekt");
    }
    return item;
  });

  return {
    schemaVersion: 1,
    mapId: "main",
    canvas: { width: 1672, height: 941 },
    background: {
      url: "/images/stable-map.png",
      alt: "Ponimetsa talli ja koplite kaart",
    },
    objects,
  };
}
