import RandomizeRom from "./lib/randomize";
import ProtectRom from "./lib/protect";
import BpsPatch from "./lib/bps-patch";

export const computeCRC32 = BpsPatch.CRC32;

export * from "./lib/signature";
export * as vanilla from "./lib/vanilla";
export { patchRom } from "./helpers/patcher";
export { findPreset, getPreset, getAllPresets } from "./lib/presets";
export { Item } from "./lib/items";
export { generateFromPreset, getSeedNumber } from "./lib/sm-rando";
export { getItemProgression, isGraphValid } from "./lib/graph/solver";
export { getAreaPortals, getBossPortals, mapPortals } from "./lib/graph/data/portals";
export {
  bytesToParams,
  stringToParams,
} from "./lib/params";
export {
  loadGraph
} from "./lib/graph/init";
export {
  getItemLocations
} from "./lib/graph/utils";
export {
  isDASHSeed,
  readParams,
  readPortals,
  readRom,
  readRomAsString
} from "./helpers/reader"
export {
  decodeSeed,
  decodeSeedFromString,
  decodeAreaPortals,
  decodeBossPortals,
  decodeItemLocations,
  encodeSeed,
  encodeSeedAsString,
} from "./helpers/encoder"
export {
  base64ToSafe,
  safeToBase64
} from "./helpers/converters"

export { RandomizeRom, ProtectRom, BpsPatch };

export type { Params, Options, Settings } from "./lib/params";
export type { Graph, Vertex, Edge } from "./lib/graph/init";
export type { ItemLocation } from "./lib/graph/solver";
export type { PlacedItem } from "./lib/graph/utils";
export type { Portal, PortalMapping } from "./lib/graph/data/portals";