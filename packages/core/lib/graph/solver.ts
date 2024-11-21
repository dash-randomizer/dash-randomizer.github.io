import { canReachStart, searchAndCache } from "./search";
import { isFungible } from "../items";
import { Graph, Vertex } from "./init";
import { MajorDistributionMode, Settings } from "../params";
import {
  addItem,
  checkFlags,
  cloneLoadout,
  copyLoadout,
  createLoadout,
  Loadout
} from "../loadout";

export type ItemLocation = {
  itemName: string;
  itemType: number;
  locationName: string;
  isMajor: boolean;
}

export const isGraphValid = (graph: Graph, settings: Settings, loadout: Loadout) => {
  const solver = new GraphSolver(graph, settings);
  return solver.isValid(loadout);
};

export const getItemProgression = (graph: Graph, settings: Settings, loadout?: Loadout) => {
  const initLoad = loadout != undefined ? loadout : createLoadout();
  const solver = new GraphSolver(graph, settings);
  if (solver.isValid(initLoad, true)) {
    const progression: ItemLocation[] = [];
    graph.sort((a, b) => a.from.progression - b.from.progression).forEach((p) => {
      if (p.from.progression === progression.length + 1) {
        progression.push(getItemLocation(p.from))
      }
    })
    return progression;
  }
  return [];
}

const revSolve = (solver: GraphSolver, load: Loadout, node: Vertex) => {
  // Note the current state of the graph
  const prevStartVertex = solver.startVertex;
  const state = solver.graph.map((e) => {
    const { pathToStart, progression } = e.from;
    e.from.pathToStart = false;
    return {
      pathToStart,
      progression
    }
  })

  // Update the solver starting vertex to be the provided node
  solver.startVertex = node;
  node.pathToStart = true;

  let result = false;
  try {
    if (solver.isValid(load, false)) {
      result = true;
    }
  } catch (e) {
  }

  // Restore the state of the graph from when we started
  solver.startVertex = prevStartVertex;
  solver.graph.forEach((e, i) => {
    e.from.pathToStart = state[i].pathToStart;
    e.from.progression = state[i].progression;
  })
  return result;
};

const getProgressionLocation = (itemNode: Vertex) => {
  if (itemNode.type == "boss") {
    const bossName = itemNode.name.substring(5)
    return `${bossName} @ ${itemNode.area}`;
  }
  return itemNode.name;
}

const getItemLocation = (itemNode: Vertex): ItemLocation => {
  if (itemNode.item == undefined) {
    throw new Error("getItemLocation: missing item");
  }
  return {
    itemName: itemNode.item.name,
    itemType: itemNode.item.type,
    locationName: getProgressionLocation(itemNode),
    isMajor: itemNode.item.isMajor,
  };
}

class GraphSolver {
  graph: Graph;
  settings: Settings;
  startVertex: Vertex;

  constructor(graph: Graph, settings: Settings) {
    this.graph = graph;
    this.settings = settings;
    this.startVertex = graph[0].from;
    if (settings.majorDistribution == MajorDistributionMode.Chozo) {
      this.graph.forEach(n => {
        if (
          n.from.progression === 0 &&
          n.from.type == "minor" &&
          n.from.name !== "Missiles (Beta)" &&
          n.from.name !== "Energy Tank (Brinstar Ceiling)"
        ) {
          n.from.progression = -1;
        }
      });
    }
  }

  isValid(initLoad: Loadout, favorProximity: boolean = false) {
    let samus = cloneLoadout(initLoad);
    let progression = 0;
    let searchVertex = this.startVertex;

    const findAll = (vertex: Vertex) =>
      searchAndCache(this.graph, vertex, checkFlags(samus));

    //-----------------------------------------------------------------
    // Collects all items where there is a round trip back to the
    // start node. All these items are collected at the same time.
    //-----------------------------------------------------------------

    const collectItem = (p: Vertex) => {
      p.progression = ++progression;
    }

    const collectSafeItems = (itemLocations: Vertex[]) => {
      const load = cloneLoadout(samus);
      let collectedItem = false;

      for (let i = 0; i < itemLocations.length; i++) {
        const p = itemLocations[i];
        addItem(load, p.item!.type);
        if (!canReachStart(this.graph, p, checkFlags(load))) {
          copyLoadout(load, samus);
          continue;
        }
        addItem(samus, p.item!.type);
        collectedItem = true;
        collectItem(p);
        if (favorProximity) {
          searchVertex = p;
          break;
        }
      }

      if (collectedItem) {
        return true;
      }

      //-----------------------------------------------------------------
      // Utility function that determines if collecting an available
      // item that does not have a round trip to the starting vertex
      // would result in a valid graph.
      //-----------------------------------------------------------------

      const reverseSolve = (filtered: Vertex[]) => {
        const p = filtered.find(n => revSolve(this, samus, n));

        if (p == undefined) {
          return false;
        }

        // Collect the item
        addItem(samus, p.item!.type);
        collectItem(p);
        if (favorProximity) {
          searchVertex = p;
        }
        return true;
      };

      //-----------------------------------------------------------------
      // Try to reverse solve the majors first and then the rest.
      //-----------------------------------------------------------------

      if (reverseSolve(itemLocations.filter((p) => !isFungible(p.item!.type)))) {
        return true;
      }
      if (reverseSolve(itemLocations.filter((p) => isFungible(p.item!.type)))) {
        return true;
      }

      return false;
    };

    while (true) {
      // Find all available items
      const all = findAll(searchVertex);
      const uncollected = all.filter((v) => v.progression === 0);

      // No items available? All done
      if (uncollected.length == 0) {
        break;
      }

      // Collect all items where we can make a round trip to the start node
      if (!collectSafeItems(uncollected)) {
        return false;
      }
    }

    //-----------------------------------------------------------------
    // Check for uncollected items. This indicates an invalid graph.
    //-----------------------------------------------------------------

    return !this.graph.some((n) => n.from.progression === 0);
  }
}