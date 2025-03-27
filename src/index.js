import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "./styles.css";

import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { stencil: false });

window.addEventListener("resize", () => {
  engine.resize();
});

function createScene() {
  const scene = new BABYLON.Scene(engine);

  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    Math.PI / 2,
    Math.PI / 4,
    12,
    BABYLON.Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 40;

  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  light.intensity = 1;
  light.specular = new BABYLON.Color3(0, 0, 0);

  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: 1000, height: 1000 },
    scene
  );
  const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
  groundMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.4);
  ground.material = groundMaterial;

  const cubes = BABYLON.LoadAssetContainerAsync("./cubes.gltf", scene)
    .then((container) => {
      const [root] = container.meshes;
      root.scaling.setAll(2);
      root.position._x = 10;
      container.addAllToScene();
    })
    .catch((error) => {
      console.error("Error loading model:", error);
    });

  const cat = BABYLON.LoadAssetContainerAsync("./cat.glb", scene)
    .then((container) => {
      container.animationGroups.forEach((ag) => {
        if (ag.name === "idle") {
          ag.start = true;
        } else {
          ag.stop();
        }
      });

      const [root] = container.meshes;
      root.scaling.setAll(1);
      container.addAllToScene();
    })
    .catch((error) => {
      console.error("Error loading model:", error);
    });

  return scene;
}

const scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.altKey) {
    if (scene.debugLayer.isVisible()) {
      scene.debugLayer.hide();
    } else {
      scene.debugLayer.show({ overlay: true });
    }
  }
});
