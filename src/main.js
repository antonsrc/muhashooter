import * as BABYLON from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/inspector";

import "./styles.css";

import { initInputDevices } from "./inputManager.js";

import { loadCat } from "./cat.js";
import { loadCubes } from "./cubes.js";
import { loadTrees } from "./trees.js";

import { createCamera } from "./camera.js";
import { createLight } from "./light.js";
import { createShadows } from "./shadows.js";
import { createGround } from "./ground.js";
import { createSpheres } from "./spheres.js";

const pressedKeys = {};

const ground = {
  size: 2000,
};

init().catch(console.error);

async function init() {
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, false, { stencil: false }, true);
  const scene = new BABYLON.Scene(engine);

  const camera = createCamera(scene);
  camera.setTarget(BABYLON.Vector3.Zero());

  const light = createLight(scene);
  const shadows = createShadows(light);

  const havokInstance = await HavokPhysics();
  const hk = new BABYLON.HavokPlugin(true, havokInstance);
  scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), hk);

  createGround(scene, { size: ground.size });

  initEventListeners(engine);
  initInputDevices(scene, canvas, pressedKeys);

  await loadCat(scene, shadows, pressedKeys, camera);

  await loadCubes(scene, shadows);
  await createSpheres(scene, shadows);

  // const trees = await loadTrees(scene, shadows, ground.size);
  // trees.addAllToScene();

  engine.runRenderLoop(() => scene.render());
}

function initEventListeners(engine) {
  window.addEventListener("resize", () => engine.resize());
}
