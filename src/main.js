import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/inspector";

import "./styles.css";

import { initKeyboardObservable } from "./inputManager.js";

import { loadCat } from "./cat.js";
import { loadCubes } from "./cubes.js";
import { loadTrees } from "./trees.js";

import { createLight } from "./light.js";
import { createShadows } from "./shadows.js";
import { createGround } from "./ground.js";

const axis = {
  w: 0,
  a: 0,
  s: 0,
  d: 0,
};

const ground = {
  size: 2000,
};

init().catch(console.error);

async function init() {
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, false, { stencil: false }, true);
  const scene = new BABYLON.Scene(engine);
  initEventListeners(engine);
  initKeyboardObservable(scene, axis, canvas);

  const light = createLight(scene);

  const shadows = createShadows(light);

  createGround(scene, { size: ground.size });

  const cat = await loadCat(scene, shadows, axis);
  cat.addAllToScene();

  const cubes = await loadCubes(scene, shadows);
  cubes.addAllToScene();

  const trees = await loadTrees(scene, shadows, ground.size);
  trees.addAllToScene();

  engine.runRenderLoop(() => scene.render());
}

function initEventListeners(engine) {
  window.addEventListener("resize", () => engine.resize());
}
