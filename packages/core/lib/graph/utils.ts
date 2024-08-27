import { Graph, Vertex } from "./init";
import { PortalMapping } from "./data/portals";
import { isAreaEdge, isBossEdge } from "../../data";
import { Location, getArea, getLocations } from "../locations";
import { ItemType } from "../items";

export type ItemLocation = {
  location: Location;
  item: ItemType;
};

export const getAreaTransitions = (graph: Graph): PortalMapping[] => {
  return graph
    .filter((n) => isAreaEdge(n))
    .map((n) => {
      return [
        { name: n.from.name.slice(), area: n.from.area.slice() },
        { name: n.to.name.slice(), area: n.to.area.slice() },
      ];
    });
};

export const getBossTransitions = (graph: Graph): PortalMapping[] => {
  return graph
    .filter((n) => isBossEdge(n) && n.from.type == "exit")
    .map((n) => {
      return [
        { name: n.from.name.slice(), area: n.from.area.slice() },
        { name: n.to.name.slice(), area: n.to.area.slice() },
      ];
    });
};

export const getItemLocations = (graph: Graph): ItemLocation[] => {
  const nodes: ItemLocation[] = [];

  const getItem = (vertex: Vertex|undefined) => {
    if (vertex == undefined || vertex.item == undefined) {
      return undefined;
    }
    return vertex.item
  }

  getLocations().forEach((l) => {
    const vertex = graph.find((e) => {
      return e.from.name == l.name && getArea(e.from.area) == l.area
    })?.from;
    nodes.push({
      location: l,
      item: getItem(vertex)
    })
  })

  return nodes;
};