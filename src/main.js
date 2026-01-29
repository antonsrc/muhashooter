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

  const box = BABYLON.MeshBuilder.CreateBox(
    "box",
    { height: 3, width: 30, depth: 20 },
    scene
  );
  const material = new BABYLON.StandardMaterial("material", scene);
  material.diffuseColor = new BABYLON.Color3(0.5, 1, 0.2);
  box.material = material;
  shadows.addShadowCaster(box);
  box.position.set(-20, 2, 40);
  new BABYLON.PhysicsAggregate(
    box,
    new BABYLON.PhysicsShapeBox(
      new BABYLON.Vector3(0, 0, 0),
      new BABYLON.Quaternion(0, 0, 0, 1),
      new BABYLON.Vector3(30, 3, 20),
      scene
    ),
    { mass: 100 },
    scene
  );

  for (let i = 0; i < 10; i++) {
    const box = BABYLON.MeshBuilder.CreateBox(
      "box" + i,
      { height: 2, width: 100 - i * 8, depth: 20 },
      scene
    );
    const material = new BABYLON.StandardMaterial("material", scene);
    material.diffuseColor = new BABYLON.Color3(0.1, 0.5, 0.2);
    box.material = material;
    shadows.addShadowCaster(box);
    box.position.set(-80, 2 + i * 2, 5);
    new BABYLON.PhysicsAggregate(
      box,
      new BABYLON.PhysicsShapeBox(
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Quaternion(0, 0, 0, 1),
        new BABYLON.Vector3(100 - i * 8, 2, 20),
        scene
      ),
      { mass: 300 },
      scene
    );
  }

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
        treeContainer.meshes[1],
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

  // const trees = await loadTrees(scene, shadows, ground.size);
  // trees.addAllToScene();

  engine.runRenderLoop(() => scene.render());
}

function initEventListeners(engine) {
  window.addEventListener("resize", () => engine.resize());
}
