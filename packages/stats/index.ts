import chalk from "chalk";
import {
  encodeSeed,
  getAllPresets,
  getPreset,
  readGraph,
  readParams,
  toSafeString,
} from "core";
import { checkSeeds } from "./lib/validate";
import { generateSeed } from "core/data";
import fs from "fs";
import path from "path";
import { getHtml_Majors } from "./lib/majors";
import { getHtml_Areas } from "./lib/areas";

export async function stats(presetName: string, numSeeds = 100) {
  const preset = getPreset(presetName);
  if (preset === undefined) {
    throw new Error(`unknown preset: ${presetName}`)
  }

  const { settings, options } = preset;
  const encodedSeeds: Uint8Array[] = [];
  for (let i = 0; i < numSeeds; i++) {
    const graph = generateSeed(i + 1, settings, options);
    encodedSeeds.push(encodeSeed({ seed: i, settings, options }, graph));
  }

  const dirPath = 'results'
  const fileName = path.resolve(dirPath, `stats_${preset.fileName}.html`);
  const style = fs.readFileSync(path.resolve(dirPath, "style.css"))

  let text = `
  <html>
    <head>
      <title>${presetName} - Stats</title>
      <style>${style}</style>
    </head><body>`;

  text += getHtml_Areas(encodedSeeds)
  text += getHtml_Majors(encodedSeeds)

  text += '</body></html>';
  fs.writeFileSync(fileName, text)

  console.log('Wrote:', fileName)
}

export async function verify(startSeed: number, endSeed: number, writeFrequency: number) {
  const presets = getAllPresets();
  const batchSize = presets.length * writeFrequency;
  const start = Date.now();
  let step = start;

  const checkSeed = (seed: number) => {
    presets.forEach((p) => {
      try {
        generateSeed(seed, p.settings, p.options);
      } catch(_) {
        console.log(chalk.red(`Invalid seed #${seed} for ${p.title}`))
      }
    })
  }

  const timeString = (val: number) => `${val.toFixed(2)} ms`;
  for (let i = startSeed; i <= endSeed; i++) {
    checkSeed(i)

    if (i % writeFrequency !== 0) {
      continue;
    }

    const curr = Date.now();
    const total = presets.length * (i - startSeed + 1);
    console.log(
      `${i.toString().padStart(2, "0")} -`,
      chalk.cyan.underline('Batch:'), `${batchSize} in ${curr - step} ms`,
      chalk.yellow.underline('Total:'), `${total} in ${curr - start} ms`,
      `[avg: ${timeString((curr - start) / total)}]`
    );
    step = curr;
  }

const delta = Date.now() - start;
const total = presets.length * (endSeed - startSeed + 1);
console.log(`Total Time: ${delta} ms [${total} seeds, `,
  `avg ${(delta / total).toFixed(2)} ms]`);
}

export function validate(dirPath: string) {
  checkSeeds(dirPath, true);
}

const args = process.argv.slice(2);

if (args.length <= 0) {
  console.log("No arguments")
  process.exit(0)
}

if (args[0] === "verify") {
  if (args.length == 1) {
    verify(1, 100, 20);
  } else if (args.length == 4) {
    verify(parseInt(args[1]), parseInt(args[2]), parseInt(args[3]));
  } else {
    console.log("Please specify preset name")
  }
} else if (args[0] === "validate") {
  validate(args[1]);
} else if (args[0] === "stats") {
  if (args.length <= 1) {
    console.log("Please specify preset name")
  } else {
    if (args.length > 2) {
      //TODO: Verify numeric input for num seeds
      stats(args[1], parseInt(args[2]))
    } else {
      stats(args[1])
    }
  }
} else if (args[0] === "encode") {
  if (args.length <= 1) {
    console.log("Please specify one or more ROM file")
  } else {
    args.slice(1).forEach((name) => {
      const rom = new Uint8Array(fs.readFileSync(name));
      console.log(toSafeString(encodeSeed(readParams(rom), readGraph(rom))));
    })
  }
} else {
  console.log("Invalid arguments:", args)
}