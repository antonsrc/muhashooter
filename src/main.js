import * as BABYLON from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/inspector";

import { initInputDevices } from "./input-manager.js";

import { loadCat } from "./cat.js";
import { loadTrees } from "./trees.js";
import { loadGrass } from "./grass.js";

import { createCamera } from "./camera.js";
import { createLight, setLightningEnvironment } from "./light.js";
import { createShadows } from "./shadows.js";
import { createGround } from "./groundFromHeightMap.js";
// import { createGround } from "./ground.js";
import { createBoxZebra } from "./box-zebra.js";
import { createEnemy } from "./enemy.js";

const pressedKeys = {};

const ground = {
  size: 700,
};

init().catch(console.error);

async function init() {
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(
    canvas,
    false,
    { stencil: false, antialias: true },
    true,
  );
  const scene = new BABYLON.Scene(engine);
  const camera = createCamera(scene);

  const havok = new BABYLON.HavokPlugin(true, await HavokPhysics());
  scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), havok);

  const light = createLight(scene);
  const shadows = createShadows(light);
  setLightningEnvironment(scene);

  let groundFromHeightMap = await createGround(scene, { size: ground.size });
  createBoxZebra(scene, shadows);
  const enemyMesh = await createEnemy(scene, shadows);

  await loadTrees(scene, ground.size / 2 - 2, groundFromHeightMap);
  await loadGrass(scene, ground.size / 2 - 2, groundFromHeightMap);
  await loadCat(scene, shadows, pressedKeys, camera, enemyMesh);

  initEventListeners(engine);
  initInputDevices(scene, canvas, pressedKeys);

  engine.runRenderLoop(() => scene.render());
}

function initEventListeners(engine) {
  window.addEventListener("resize", () => engine.resize());
}
