import * as BABYLON from "@babylonjs/core";

import HavokPhysics from "@babylonjs/havok";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/inspector";

import "./styles.css";

import { initInputDevices } from "./input-manager.js";

import { loadCat } from "./cat.js";
import { loadCubes } from "./cubes.js";
import { loadTrees } from "./trees.js";

import { createCamera } from "./camera.js";
import { createLight } from "./light.js";
import { createShadows } from "./shadows.js";
import { createGround } from "./ground.js";
import { createSpheres } from "./spheres.js";
import { createMonitoring } from "./monitoring.js";

const pressedKeys = {};

const ground = {
  size: 1000,
};

init().catch(console.error);

async function init() {
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, false, { stencil: false }, true);
  const scene = new BABYLON.Scene(engine);
  const havok = await HavokPhysics();
  const hk = new BABYLON.HavokPlugin(true, havok);
  scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), hk);

  const camera = createCamera(scene);
  const light = createLight(scene);
  const shadows = createShadows(light);

  createGround(scene, { size: ground.size });
  createMonitoring(scene, engine);

  const treeContainer = await BABYLON.LoadAssetContainerAsync(
    "./tree.glb",
    scene
  );
  const [treeMeshes] = treeContainer.meshes;
  treeMeshes.scaling.setAll(1);
  treeMeshes.position.x = 0;
  treeMeshes.position.z = 15;

  treeContainer.meshes.forEach((mesh) => {
    if (mesh.getTotalVertices()) {
      new BABYLON.PhysicsAggregate(
        mesh,
        BABYLON.PhysicsShapeType.MESH,
        { mass: 1 },
        scene
      );
    }
  });

  shadows.addShadowCaster(treeMeshes);
  treeContainer.addAllToScene();

  initEventListeners(engine);
  initInputDevices(scene, canvas, pressedKeys);

  await loadCat(scene, shadows, pressedKeys, camera);
  await loadCubes(scene, shadows);
  await createSpheres(scene, shadows);

  const trees = await loadTrees(scene, shadows, ground.size);
  trees.addAllToScene();

  engine.runRenderLoop(() => scene.render());
}

function initEventListeners(engine) {
  window.addEventListener("resize", () => engine.resize());
}
