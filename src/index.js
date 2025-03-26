import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "./styles.css";

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
  camera.upperRadiusLimit = 20;

  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  light.intensity = 1;

  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: 100, height: 100 },
    scene
  );

  const cubes = BABYLON.LoadAssetContainerAsync("./cubes.gltf", scene)
    .then((container) => {
      console.log(`Model loaded:`, container);
      const [root] = container.meshes;
      root.scaling.setAll(0.7);

      console.log(`Model loaded:`, container.meshes);
      container.addAllToScene();
    })
    .catch((error) => {
      console.error("Error loading model:", error);
    });

  const cat = BABYLON.LoadAssetContainerAsync("./cat.glb", scene)
    .then((container) => {
      console.log(`Model loaded:`, container);
      const [root] = container.meshes;
      root.scaling.setAll(1);

      console.log(`Model loaded:`, container.meshes);
      container.addAllToScene();
    })
    .catch((error) => {
      console.error("Error loading model:", error);
    });


    // BABYLON.SceneLoader.ImportMeshAsync(null,"./", "cat.glb", scene).then((res) => {
    // });
    
  return scene;
}

const scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});
