import { standardVertices } from "./data/standard/vertex";
import { crateriaEdges } from "./data/standard/edges/crateria";
import { greenbrinstarEdges } from "./data/standard/edges/greenbrinstar";
import { redbrinstarEdges } from "./data/standard/edges/redbrinstar";
import { kraidslairEdges } from "./data/standard/edges/kraid";
import { crocomireEdges } from "./data/standard/edges/crocomire";
import { westmaridiaEdges } from "./data/standard/edges/westmaridia";
import { eastmaridiaEdges } from "./data/standard/edges/eastmaridia";
import { uppernorfairEdges } from "./data/standard/edges/uppernorfair";
import { lowernorfairEdges } from "./data/standard/edges/lowernorfair";
import { wreckedshipEdges } from "./data/standard/edges/wreckedship";
import { bossEdges } from "./data/standard/edges/boss";
import { BossMode, MapLayout, MajorDistributionMode } from "./params";
import { RecallVertexUpdates } from "./data/recall/vertex";
import { RecallEdgeUpdates } from "./data/recall/edges";
import { StandardAreaEdgeUpdates } from "./data/standard/area";
import { generatePortals, PortalMapping } from "./data/portals";
import { bossItem, Item, ItemType } from "../items";
import DotNetRandom from "../dotnet-random";
import { ChozoVertexUpdates } from "./data/chozo/vertex";
import { RelaxedEdgeUpdates } from "./data/relaxed/edges";

export type Condition = boolean | (() => any);

export type Vertex = {
  name: string;
  type: string;
  area: string;
  item: ItemType | undefined;
  pathToStart: boolean;
}

type VertexUpdate = {
  name: string;
  type: string;
}

export type Edge = {
  from: Vertex;
  to: Vertex;
  condition: Condition;
}

type EdgeUpdate = {
  edges: string[];
  requires: Condition;
}

export type Graph = Edge[];

//-----------------------------------------------------------------
// Returns a structure containing all edges grouped by area.
//-----------------------------------------------------------------

const getStandardEdges = () => {
  return {
    Crateria: crateriaEdges,
    GreenBrinstar: greenbrinstarEdges,
    RedBrinstar: redbrinstarEdges,
    KraidsLair: kraidslairEdges,
    CrocomiresLair: crocomireEdges,
    WestMaridia: westmaridiaEdges,
    EastMaridia: eastmaridiaEdges,
    UpperNorfair: uppernorfairEdges,
    LowerNorfair: lowernorfairEdges,
    WreckedShip: wreckedshipEdges,
  };
};

//-----------------------------------------------------------------
// Returns an array of all vertices on the game world.
//-----------------------------------------------------------------

const getAllVertices = (): Vertex[] => {
  return Object.entries(standardVertices)
    .map(([k, v]) => {
      return Object.entries(v).map(([name, type]) => {
        return {
          name: name,
          type: type,
          area: k,
          item: undefined,
          pathToStart: false,
        };
      });
    })
    .reduce((acc, cur) => {
      return acc.concat(cur);
    }, []);
};

//-----------------------------------------------------------------
// Build a graph representing the game world.
//-----------------------------------------------------------------
const createGraph = (
  portalMapping: PortalMapping[],
  vertexUpdates: VertexUpdate[],
  edgeUpdates: EdgeUpdate[],
): Graph => {
  //-----------------------------------------------------------------
  // Get all vertices for the graph. Vertices represent locations
  // within the game world.
  //-----------------------------------------------------------------

  const allVertices = getAllVertices();

  const findVertex = (name: string, area?: string) => {
    const vertex = allVertices.find((v) => {
      if (area != undefined && v.area != area) {
        return false;
      }
      return v.name == name;
    });
    if (vertex == undefined) {
      const msg = `createGraph: could not find vertex, ${name} ${area}`;
      throw new Error(msg);
    }
    return vertex;
  };

  const loadEdges = (areaEdges: any, area?: string) => {
    return Object.entries(areaEdges)
      .map(([from, w]) => {
        return Object.entries(w as any).map(([to, condition]): Edge => {
          return {
            from: findVertex(from, area),
            to: findVertex(to, area),
            condition: condition as Condition,
          };
        });
      })
      .reduce((acc, cur) => {
        return acc.concat(cur);
      }, []);
  }

  //-----------------------------------------------------------------
  // Apply specified vertex updates. Currently restricted to type
  // but may include other options eventually.
  //-----------------------------------------------------------------

  vertexUpdates.forEach((v) => {
    //TODO: Check areas at some point
    findVertex(v.name).type = v.type;
  });

  //-----------------------------------------------------------------
  // Converts the edge data into an array of edges which will be
  // used to actually create graph objects. This code runs only
  // once when the module is loaded.
  //-----------------------------------------------------------------

  let edges: Edge[] = Object.entries(getStandardEdges())
    .map(([area, areaEdges]) => loadEdges(areaEdges as any))
    .reduce((acc, cur) => acc.concat(cur), []);

  //-----------------------------------------------------------------
  // Add boss edges.
  //-----------------------------------------------------------------

  const bossAreas = ["KraidsLair", "WreckedShip", "EastMaridia", "LowerNorfair"];
  bossEdges.forEach(b => {
    const keys = Object.keys(b);
    bossAreas.forEach(area => {
      const portal = portalMapping.find(p => {
        if (p[1].area != area) {
          return false;
        }
        return keys.includes(p[1].name)
      })
      if (portal != null) {
        edges = edges.concat(loadEdges(b as any, area))
      }
    })
  })

  //-----------------------------------------------------------------
  // Get all edges for the graph. Edges establish the condition to
  // travel from one vertex to another.
  //-----------------------------------------------------------------

  edges = edges
    .concat(
      portalMapping.map((a) => {
        return {
          from: findVertex(a[0].name, a[0].area),
          to: findVertex(a[1].name, a[1].area),
          condition: true,
        };
      })
    )
    .concat(
      portalMapping.map((a) => {
        return {
          from: findVertex(a[1].name, a[1].area),
          to: findVertex(a[0].name, a[0].area),
          condition: true,
        };
      })
    );

  //-----------------------------------------------------------------
  // Apply specified edge updates. This could simply be a logic
  // change or could include edits to the map.
  //-----------------------------------------------------------------

  edgeUpdates.forEach((c) => {
    const [from, to] = c.edges;
    //TODO: Not an issue now but check areas eventually
    const edge = edges.find((n) => n.from.name == from && n.to.name == to);
    if (edge == null) {
      throw new Error(`Could not find edge from ${from} to ${to}`);
    }
    edge.condition = c.requires;
  });


  //-----------------------------------------------------------------
  // Set a flag on the start vertex. This flag exists on all
  // vertices and is used for caching to speed up solving.
  //-----------------------------------------------------------------

  edges[0].from.pathToStart = true;

  //-----------------------------------------------------------------
  // Return all valid edges. Some edges are placeholders and may
  // not be available for the current graph. There is no reason
  // to include those as it will slow down solving.
  //-----------------------------------------------------------------

  return edges.filter(e => e.condition !== false);
};

//-----------------------------------------------------------------
// Creates a copy of the graph. New memory is allocated for the
// vertices and edges so that changes can be made to the cloned
// graph without changing the original.
//-----------------------------------------------------------------

export const cloneGraph = (graph: Graph): Graph => {
  const newVertices = getAllVertices();

  const remap = (orig: Vertex) => {
    let v = newVertices.find((v) => v.name == orig.name && v.area == orig.area);
    if (v == undefined) {
      throw new Error('cloneGraph: missing vertex to remap')
    }
    v.type = orig.type;
    v.area = orig.area;
    v.pathToStart = orig.pathToStart;
    if (orig.item != undefined) {
      v.item = {...orig.item};
    }
    return v;
  }

  return graph.map((e) => {
    return {
      from: remap(e.from),
      to: remap(e.to),
      condition: e.condition,
    };
  });
};

//-----------------------------------------------------------------
// Gets an array of edge updates based on the settings.
//-----------------------------------------------------------------

const getEdgeUpdates = (mapLayout: number, areaShuffle: boolean): EdgeUpdate[] => {
  switch (mapLayout) {
    case MapLayout.Standard:
    case MapLayout.Classic:
      if (areaShuffle) {
        return StandardAreaEdgeUpdates;
      }
      return [];
    case MapLayout.Recall:
      if (areaShuffle) {
        return RecallEdgeUpdates.concat(StandardAreaEdgeUpdates);
      }
      return RecallEdgeUpdates;
    default:
      throw new Error(`Unknown map layout: ${mapLayout}`);
  }
};

//-----------------------------------------------------------------
// Gets an array of vertex updates based on the settings.
//-----------------------------------------------------------------

const getVertexUpdates = (mode: number): VertexUpdate[] => {
  switch(mode) {
    case MajorDistributionMode.Recall:
      return RecallVertexUpdates;
    case MajorDistributionMode.Chozo:
      return ChozoVertexUpdates;
    default:
      return [];
  }
}

//-----------------------------------------------------------------
// Adds pseudo items to a graph for defeating bosses based on the
// settings provided. Updates the areas of boss nodes and related
// nodes like the exit and prize nodes.
//-----------------------------------------------------------------

const addBossItems = (graph: Graph) => {
  const isUnique = (value: Vertex, index: number, array: Vertex[]) => {
    return array.indexOf(value) === index;
  };
  const bosses = graph
    .filter((e) => e.from.type == "boss")
    .map((e) => e.from)
    .filter(isUnique);

  bosses.forEach(boss => {
    switch (boss.area) {
      case "KraidsLair":
        boss.item = bossItem(Item.DefeatedBrinstarBoss);
        break;
      case "WreckedShip":
        boss.item = bossItem(Item.DefeatedWreckedShipBoss);
        break;
      case "EastMaridia":
        boss.item = bossItem(Item.DefeatedMaridiaBoss);
        break;
      case "LowerNorfair":
        boss.item = bossItem(Item.DefeatedNorfairBoss);
        break;
    }
  });
};

//-----------------------------------------------------------------
// Loads a graph using the specified settings.
//-----------------------------------------------------------------

export const loadGraph = (
  seed: number,
  attempt: number,
  mapLayout: number,
  majorDistributionMode: number,
  areaShuffle = false,
  relaxed = false,
  bossMode = BossMode.Vanilla,
  portals?: PortalMapping[]
) => {
  const getSeed = () => {
    if (attempt == 1) {
      return seed;
    }

    const seedGen = new DotNetRandom(-seed);
    for (let i = 0; i < attempt - 2; i++) {
      seedGen.InternalSample();
    }
    return seedGen.NextInRange(1, 1000000);
  };

  const getPortals = () =>
    portals ? portals : generatePortals(getSeed(), areaShuffle, bossMode);

  const edgeUpdates: EdgeUpdate[] = relaxed ? RelaxedEdgeUpdates : [];

  const g = createGraph(
    getPortals(),
    getVertexUpdates(majorDistributionMode),
    edgeUpdates.concat(getEdgeUpdates(mapLayout, areaShuffle))
  );
  addBossItems(g);
  return g;
};
