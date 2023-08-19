'use client'

import { useEffect, useState } from 'react'
import { saveAs } from 'file-saver'
import useMounted from '@/app/hooks/useMounted'
import { useVanilla } from '@/app/generate/vanilla'
import styles from './seed.module.css'
import { RandomizeRom, fetchSignature } from 'core'
import { MajorDistributionMode } from 'core/params'
import { cn } from '@/lib/utils'
import Button from '@/app/components/button'

function downloadFile(data: any, name: string) {
  saveAs(new Blob([data]), name)
}

type Seed = {
  data: any
  name: string
}

const getItemSplit = (value: number) => {
  switch (value) {
    case MajorDistributionMode.Standard:
      return 'Major/Minor'
    case MajorDistributionMode.Recall:
      return 'Recall Major/Minor'
    default:
      return 'Full'
  }
}

const getBossMode = (value: number) => {
  return (value === 2) ? 'Randomized' : 'Standard'
}

const getAreaMode = (value: boolean) => value ? 'Randomized' : 'Standard'

const parseSettings = (parameters: any) => {
  const { bossMode, randomizeAreas, itemPoolParams } = parameters
  const randomizeParams = {
    'Item Split': getItemSplit(itemPoolParams.majorDistribution.mode),
    'Boss': getBossMode(parameters.settings.bossMode),
    'Area': getAreaMode(parameters.settings.randomizeAreas)
  }
  return { randomizeParams }
}

const Settings = ({ items }: any) => {
  return (
    <div></div>
  )
}

export default function Seed({ parameters }: any) {
  const mounted = useMounted()
  const { data: vanilla, isLoading } = useVanilla()
  const [seed, setSeed] = useState<Seed|null>(null)
  const [signature, setSignature] = useState<string|null>('BEETOM BULL YARD GAMET')

  useEffect(() => {
    const initialize = async () => {
      if (vanilla && !seed?.data) {
        const { seed: seedNum, mapLayout, itemPoolParams, settings, options } = parameters
        const seedData = await RandomizeRom(seedNum, mapLayout, itemPoolParams, settings, options, {
          vanillaBytes: vanilla,
        })
        const signature = fetchSignature(seedData.data)
        setSignature(signature)
        setSeed(seedData)
      }
    }
    initialize()
  }, [parameters, vanilla, seed])

  const hasVanilla = Boolean(vanilla)

  if (isLoading || !mounted) {
    return null
  }

  console.log(parameters)
  const parsedParams = parseSettings(parameters)

  console.log(parsedParams.randomizeParams)

  return (
    <div>
      <div className={cn(styles.signature, !vanilla && styles.noVanilla)}>{signature}</div>
      <div className={styles.download}>
        {hasVanilla ? (
          <Button onClick={(evt) => {
            evt.preventDefault()
            // TODO: Refactor to show loading state if still getting seed
            if (seed) {
              downloadFile(seed?.data, seed?.name)
            }
          }}>Download {seed?.name}</Button>
        ) : <Button variant="secondary">Upload Vanilla</Button>}
      </div>
      <Settings items={null} />
    </div>
  )
}

// useEffect(() => {
//   async function startup() {
//     try {
//       new vanilla.vanillaROM();
//       const{ seed, mapLayout, itemPoolParams, settings, options } = stringToParams(params.seed);
//       Object.assign(settings, {preset: "Custom"});
//       if (!seed || !mapLayout || !itemPoolParams || !settings || !options) {
//         const missingEvt = new CustomEvent("seed:params-missing");
//         document.dispatchEvent(missingEvt);
//         return null;
//       }

//       const vanillaBytes = await vanilla.getVanilla();
//       if (!vanillaBytes) {
//         const vanillaEvt = new CustomEvent("seed:vanilla-missing", {
//           detail: { seed, mapLayout, itemPoolParams, settings, options },
//         });
//         document.dispatchEvent(vanillaEvt);
//         return null;
//       }
//       const { data, name } = (await RandomizeRom(
//         seed, mapLayout, itemPoolParams, settings, options, {
//         vanillaBytes,
//       })) as { data: any; name: string };
//       const signature = fetchSignature(data);
//       const autoDownload = !searchParams.get('download')
//       const readyEvt = new CustomEvent("seed:ready", {
//         detail: { data, name, seed, mapLayout, itemPoolParams,
//                   settings, options, autoDownload, signature },
//       });
//       document.dispatchEvent(readyEvt);

//       if (autoDownload) {
//         setTimeout(() => {
//           downloadFile(data, name);
//           const downloadEvt = new CustomEvent("seed:download", {
//             detail: { name },
//           });
//           document.dispatchEvent(downloadEvt);
//         }, 850);
//       }
//     } catch (e) {
//       const message = (e as Error).message;
//       console.error(message);
//     }
//   }

//   document.addEventListener("seed:params-missing", (_) => {
//     setContainerClass("params-missing");
//   });

//   document.addEventListener("seed:vanilla-missing", (evt: any) => {
//     const { seed, mapLayout, itemPoolParams, settings, options } = evt.detail;
//     setPageSettings({
//       seedNum: seed,
//       mapLayout: mapLayout,
//       itemPoolParams: itemPoolParams,
//       settings: {...settings, preset: "Custom"},
//       options: options
//     });
//     setContainerClass("vanilla-missing loaded");

//     document.addEventListener("vanillaRom:set", async (evt: any) => {
//       const vanillaBytes = evt.detail.data;
//       const { data, name } = (await RandomizeRom(seed, mapLayout,
//         itemPoolParams, settings, options, {
//         vanillaBytes,
//       })) as { data: any; name: string };
//       const signature = fetchSignature(data);
//       setSignature(signature);
//       setRomData({ data: data, name: name });
//       setContainerClass("loaded");
//       downloadFile(data, name);
//     });
//   });

//   document.addEventListener("seed:ready", (evt: any) => {
//     if (evt.detail.autoDownload) {
//       setDownloading(true);
//     }
//     setRomData({ data: evt.detail.data, name: evt.detail.name });
//     const { seed, mapLayout, itemPoolParams, settings, options } = evt.detail;
//     setPageSettings({
//       seedNum: seed,
//       mapLayout: mapLayout,
//       itemPoolParams: itemPoolParams,
//       settings: settings,
//       options: options
//     });
//     setSignature(evt.detail.signature);
//     setContainerClass("loaded");
//   });

//   document.addEventListener("seed:download", (evt: any) => {
//     setDownloading(false);
//   });

//   startup();
// }, [params.seed, searchParams]);