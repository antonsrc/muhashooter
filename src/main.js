import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/inspector";

import "./styles.css";

import { loadCat } from "./cat.js";
import { loadCubes } from "./cubes.js";
import { loadTrees } from "./trees.js";

import { createLight } from "./light.js";
import { createShadows } from "./shadows.js";
import { createGround } from "./ground.js";
// 🔥 УДАЛИЛ: import { createCamera } from "./camera.js"; - камера теперь в cat.js

import { initKeyboardObservable } from "./inputMngr.js";

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
  const scene = await createScene(canvas, engine);
  initEventListeners(engine);
  initKeyboardObservable(scene, axis);

  engine.runRenderLoop(() => scene.render());
}

async function createScene(canvas, engine) {
  const scene = new BABYLON.Scene(engine);
  const light = createLight(scene);
  const shadows = createShadows(light);
  createGround(scene, { size: ground.size });

  // 🔥 УПРОЩЕНО: Просто загружаем кота - камера создастся внутри
  const cat = await loadCat(scene, shadows, axis);
  cat.addAllToScene();

  const cubes = await loadCubes(scene, shadows);
  cubes.addAllToScene();

  const trees = await loadTrees(scene, shadows, ground.size);
  trees.addAllToScene();

  return scene;
}

function initEventListeners(engine) {
  window.addEventListener("resize", () => engine.resize());
}
