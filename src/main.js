import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
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
  size: 1000,
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

  for (let i = 0; i < 8; i++) {
    const box = BABYLON.MeshBuilder.CreateBox(
      "box" + i,
      { height: 2, width: 70 - i * 8, depth: 20 },
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
        new BABYLON.Vector3(70 - i * 8, 2, 20),
        scene
      ),
      { mass: 0 },
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


  let sceneInstr = new BABYLON.SceneInstrumentation(scene);
  let engineInstrumentation = new BABYLON.EngineInstrumentation(engine);
  engineInstrumentation.captureShaderCompilationTime = true;

  function addTextBlock(panel, params) {
    const textBlock = new GUI.TextBlock();
    textBlock.height = "20px";
    textBlock.color = "white";
    textBlock.textHorizontalAlignment = 0;

    if (params?.fontSize) {
      textBlock.fontSize = params.fontSize;
    } else {
      textBlock.fontSize = 14;
    }

    if (params?.fontWeight) {
      textBlock.fontWeight = params.fontWeight;
    }
    panel.addControl(textBlock);
    return textBlock;
  }

  const panel = new GUI.StackPanel();
  panel.horizontalAlignment = 0;
  panel.verticalAlignment = 0;
  panel.height = "100%";
  panel.paddingTop = "8px";
  panel.paddingLeft = "10px";
  GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI").addControl(panel);

  const meshesLength = addTextBlock(panel);
  const activeMeshesLength = addTextBlock(panel);
  const activeVertices = addTextBlock(panel);
  const activeIndices = addTextBlock(panel);
  const materialsLength = addTextBlock(panel);
  const texturesLength = addTextBlock(panel);
  const animationLength = addTextBlock(panel);
  const drawCalls = addTextBlock(panel);
  const totalLights = addTextBlock(panel);
  const shaderTotal = addTextBlock(panel);
  const heapSize = addTextBlock(panel);
  const fpsValue = addTextBlock(panel, { fontWeight: "bold", fontSize: 24 });

  scene.registerAfterRender(() => {
    meshesLength.text = "Meshes: " + scene.meshes.length;
    activeMeshesLength.text =
      "Active Meshes: " + scene.getActiveMeshes().length;
    activeVertices.text = `Total Vertices: ${scene.totalVerticesPerfCounter.current.toLocaleString()}`;
    activeIndices.text = `Active Indices: ${scene.totalActiveIndicesPerfCounter.current.toLocaleString()}`;
    materialsLength.text = "Materials: " + scene.materials.length;
    texturesLength.text = "Textures: " + scene.textures.length;
    animationLength.text = "Animations: " + scene.animatables.length;
    drawCalls.text = "Draw Calls: " + sceneInstr.drawCallsCounter.current;
    totalLights.text = "Lights: " + scene.lights.length;
    shaderTotal.text =
      "Total Shaders: " +
      engineInstrumentation.shaderCompilationTimeCounter.count;
    heapSize.text =
      "Heap Used: " +
      (!performance.memory
        ? "unavailabe"
        : (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed() + " Mb");
    fpsValue.text = "FPS: " + engine.getFps().toFixed();
  });


  
  engine.runRenderLoop(() => scene.render());
}

function initEventListeners(engine) {
  window.addEventListener("resize", () => engine.resize());
}
