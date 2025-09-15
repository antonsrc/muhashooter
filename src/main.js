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
import { createCamera } from "./camera.js";

const pressedKeys = {};
const axis = {
  forward: 0,
  right: 0,
  up: 0,
};
const ground = {
  size: 2000,
};

init().catch(console.error);

async function init() {
  const CANVAS = document.getElementById("renderCanvas");
  const ENGINE = new BABYLON.Engine(CANVAS, false, { stencil: false }, true);
  const SCENE = await createScene(CANVAS, ENGINE);
  ENGINE.runRenderLoop(() => SCENE.render());

  initEventListeners(ENGINE);
  initKeyboardObservable(SCENE);
}

async function createScene(canvas, engine) {
  const scene = new BABYLON.Scene(engine);
  const light = createLight(scene);
  const shadows = createShadows(light);
  createCamera(scene, canvas);
  createGround(scene, { size: ground.size });

  const cat = await loadCat(scene, shadows, axis);
  cat.addAllToScene();

  const cubes = await loadCubes(scene, shadows);
  cubes.addAllToScene();

  const trees = await loadTrees(scene, shadows, ground.size);
  trees.addAllToScene();

  return scene;
}

function updateAxis(axis) {
  axis.forward = (pressedKeys.KeyW ? 1 : 0) + (pressedKeys.KeyS ? -1 : 0);
  axis.right = (pressedKeys.KeyA ? -1 : 0) + (pressedKeys.KeyD ? 1 : 0);
  axis.up = (pressedKeys.Space ? 1 : 0) + (pressedKeys.ShiftLeft ? -1 : 0);
}

function initEventListeners(engine) {
  window.addEventListener("resize", () => engine.resize());
}

function initKeyboardObservable(scene) {
  scene.onKeyboardObservable.add((ev) => {
    const code = ev.event.code;
    const KEYDOWN = ev.type === BABYLON.KeyboardEventTypes.KEYDOWN;
    const KEYUP = ev.type === BABYLON.KeyboardEventTypes.KEYUP;

    if (KEYDOWN) {
      pressedKeys[code] = true;
    } else if (KEYUP) {
      pressedKeys[code] = false;
    }

    updateAxis(axis);

    if (KEYDOWN && ev.event.ctrlKey && ev.event.altKey) {
      if (scene.debugLayer.isVisible()) {
        scene.debugLayer.hide();
      } else {
        scene.debugLayer.show({ overlay: true });
      }
    }

    ev.event.preventDefault();
  });
}
