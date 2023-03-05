let vanillaBytes = null;

function DisableFixedSeed() {
   let temp = document.getElementById("fixed_value");
   temp.disabled = true;
   temp.value = "";
}

function EnableFixedSeed() {
   let temp = document.getElementById("fixed_value");
   temp.disabled = false;
   temp.value = 1;
}

async function LoadFile(path) {
   let response = await fetch(path);
   let buffer = await response.arrayBuffer();
   return new Uint8Array(buffer);
}

async function RandomizeRom() {
   let seed = 0;
   const fixedSeed = document.getElementById("fixed").checked;
   const fixedValueInput = document.getElementById("fixed_value");
   const minValue = Number(fixedValueInput.min);
   const maxValue = Number(fixedValueInput.max);

   if (fixedSeed) {
      const fixedValue = Number(fixedValueInput.value);

      if (
         !Number.isInteger(fixedValue) ||
         fixedValue < minValue ||
         fixedValue > maxValue
      ) {
         alert("Invalid seed specified.");
         return;
      }
      seed = fixedValue;
   } else {
      let randomArray = new Uint32Array(1);
      window.crypto.getRandomValues(randomArray);

      let numSeeds = maxValue - minValue + 1;
      let modSeed = randomArray[0] % numSeeds;
      seed = minValue + modSeed;
   }

   //
   let getPrePool;
   let canPlaceItem;
   let mode;
   let gameModeName;

   switch (document.getElementById("game_mode").value) {
      case "sm":
         mode = new ModeStandard(seed, getLocations());
         getPrePool = getMajorMinorPrePool;
         canPlaceItem = isValidMajorMinor;
         gameModeName = "mm";
         break;

      case "sf":
         mode = new ModeStandard(seed, getLocations());
         getPrePool = getFullPrePool;
         canPlaceItem = isEmptyNode;
         gameModeName = "full";
         break;

      case "rm":
         mode = new ModeRecall(seed, getLocations());
         getPrePool = getMajorMinorPrePool;
         canPlaceItem = isValidMajorMinor;
         gameModeName = "rm";
         break;

      case "rf":
         mode = new ModeRecall(seed, getLocations());
         getPrePool = getFullPrePool;
         canPlaceItem = isEmptyNode;
         gameModeName = "rf";
         break;

      default:
         mode = new ModeStandard(seed, getLocations());
         getPrePool = getMajorMinorPrePool;
         canPlaceItem = isValidMajorMinor;
         gameModeName = "mm";
         break;
   }

   let gameMode = game_modes.find((mode) => mode.name == gameModeName);

   function setOtherRandoSettings(areaSettings, bossSettings) {
      areaElements = document.getElementsByName(areaSettings);
      bossElements = document.getElementsByName(bossSettings);

      //Get area rando setting
      for (i = 0; i < areaElements.length; i++) {
         if (areaElements[i].checked) {
            switch (areaElements[i].value) {
               case "Full":
                  //Call area rando setup function with Full parameter
                  //or set area rando variable
                  console.log("Full Area Randomization");
                  break;
               case "Light":
                  //Call area rando setup function with Light parameter
                  //or set area rando variable
                  console.log("Light Area Randomization");
                  break;
               case "None":
                  //Do nothing for now.
                  console.log("No Area Randomization");
                  break;
               default:
               //Do nothing.
            }
         }
      }

      //Get boss rando setting
      for (i = 0; i < bossElements.length; i++) {
         if (bossElements[i].checked) {
            switch (bossElements[i].value) {
               case "On":
                  //Call boss rando setup function with Full parameter
                  //or set boss rando variable
                  console.log("Boss Randomization On");
                  break;
               case "Off":
                  //Call boss rando setup function with Light parameter
                  //or set boss rando variable
                  console.log("Boss Randomization Off");
                  break;
               default:
               //Do nothing.
            }
         }
      }
   }

   setOtherRandoSettings("area_type", "boss_type");

   if (gameMode == null) {
      alert("Selected Game Mode is currently unsupported for web generation.");
      return;
   }

   // Setup the initial loadout.
   let initLoad = new Loadout();
   initLoad.hasCharge = true;

   // Place the items.
   performVerifiedFill(
      seed,
      mode.nodes,
      mode.itemPool,
      getPrePool,
      initLoad,
      canPlaceItem
   );

   // Load the base patch associated with this game mode.
   const basePatch = await BpsPatch.Load(gameMode.patch);

   // Process other options.
   let options = {
      DisableFanfare: 0,
   };

   // Enable or disable item fanfares.
   const fanfare_options = document.getElementsByName("fanfare_mode");
   fanfare_options.forEach((i) => {
      if (i.checked && i.value == "Off") {
         options.DisableFanfare = 1;
      }
   });

   // Generate the seed specific patch (item placement, etc.)
   const seedPatch = generateSeedPatch(seed, gameMode, mode.nodes, options);

   // Create the rom by patching the vanilla rom.
   patchedBytes = patchRom(vanillaBytes, basePatch, seedPatch);

   // Save the new file on the local system.
   saveAs(
      new Blob([patchedBytes]),
      getFileName(seed, gameMode.prefix, options)
   );
}

function ToHexString(byteArray) {
   return Array.from(byteArray, function (byte) {
      return ("0" + (byte & 0xff).toString(16)).slice(-2);
   }).join("");
}

async function SetVanillaRom(value, inputEl) {
   let check = await window.crypto.subtle.digest("SHA-256", value);
   if (
      ToHexString(new Uint8Array(check)) ==
      "12b77c4bc9c1832cee8881244659065ee1d84c70c3d29e6eaf92e6798cc2ca72"
   ) {
      const event = new CustomEvent("vanillaRom:input", {
         detail: {
            data: new Uint8Array(value),
         }
      })
      document.dispatchEvent(event)
   } else if (
      ToHexString(new Uint8Array(check)) ==
      "9a4441809ac9331cdbc6a50fba1a8fbfd08bc490bc8644587ee84a4d6f924fea"
   ) {
      console.warn('You have entered a headered ROM. The header will now be removed.')
      const unheaderedContent = value.slice(512)
      await SetVanillaRom(unheaderedContent, inputEl)
   } else {
      alert("Vanilla Rom does not match checksum.");
      inputEl.value = "";
   }
}

document.addEventListener('vanillaRom:set', (evt) => {
   let randoBtn = document.getElementById("randomize_button");
   if (randoBtn != null) {
      randoBtn.disabled = false;
   }

   let vanillaRomInput = document.getElementById("vanilla-rom");
   vanillaRomInput.disabled = true;
   vanillaBytes = evt.detail.data;
})

document.addEventListener('vanillaRom:cleared', (evt) => {
   let randoBtn = document.getElementById("randomize_button");
   if (randoBtn != null) {
      randoBtn.disabled = true;
   }

   let vanillaRomInput = document.getElementById("vanilla-rom");
   vanillaRomInput.disabled = false;
   vanillaBytes = null;
})

function VerifyVanillaRom() {
   let vanillaRomInput = document.getElementById("vanilla-rom");
   let vanillaRom = vanillaRomInput.files[0];
   let reader = new FileReader();
   reader.readAsArrayBuffer(vanillaRom);

   reader.onload = async function () {
      await SetVanillaRom(reader.result, vanillaRomInput)
   };

   reader.onerror = function () {
      alert("Failed to load file.");
   };
}
