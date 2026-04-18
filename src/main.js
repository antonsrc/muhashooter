import * as BABYLON from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/inspector";

import "./styles.css";

import { initInputDevices } from "./input-manager.js";

import { loadCat } from "./cat.js";
import { loadCubes } from "./cubes.js";
import { loadTree } from "./tree.js";
import { loadTrees } from "./trees.js";
import { loadGrass } from "./grass.js";

import { createCamera } from "./camera.js";
import { createLight } from "./light.js";
import { createShadows } from "./shadows.js";
import { createGround } from "./groundFromHeightMap.js";

import { createSpheres } from "./spheres.js";
import { createBoxZebra } from "./box-zebra.js";

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
    true
  );

  const scene = new BABYLON.Scene(engine);
  // scene.clearColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  // scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);
  // scene.fogColor = new BABYLON.Color3(0.9, 0.9, 0.85);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.004;

  const havok = await HavokPhysics();
  const hk = new BABYLON.HavokPlugin(true, havok);
  scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), hk);

  scene.debugLayer.show({ showInspector: true, showExplorer: true });

  const camera = createCamera(scene);
  const light = createLight(scene);
  const shadows = createShadows(light);

  // createSpheres(scene, shadows);
  let groundFromHeightMap = await createGround(scene, { size: ground.size });
  // createMonitoring(scene, engine);
  createBoxZebra(scene, shadows);

  await loadCat(scene, shadows, pressedKeys, camera);
  // await loadCubes(scene, shadows);
  // await loadTree(scene, shadows);
  await loadTrees(scene, shadows, ground.size, groundFromHeightMap);
  await loadGrass(scene, shadows, ground.size, groundFromHeightMap);

  initEventListeners(engine);
  initInputDevices(scene, canvas, pressedKeys);

  engine.runRenderLoop(() => scene.render());
}

function initEventListeners(engine) {
  window.addEventListener("resize", () => engine.resize());
}
