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
  // groundMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.4);
  const groundTexture = new BABYLON.Texture("./grass.jpg", scene);
  groundTexture.uScale = 20;
  groundTexture.vScale = 20;
  groundMaterial.diffuseTexture = groundTexture;
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
      const [root] = container.meshes;
      root.scaling.setAll(1);
      container.addAllToScene();

      const playIdle = () => {
        container.animationGroups
          .find((group) => group.name === "idle")
          .start(true);
      };

      const playWalk = () => {
        container.animationGroups.find((group) => group.name === "walk").play();
      };

      playIdle();

      root.rotationQuaternion = BABYLON.Quaternion.Identity();

      const targetPoint = root.position.clone();
      const targetRotation = root.rotationQuaternion.clone();

      const speed = 10;
      const rotLerpSpeed = 10;
      const rotAmount = 4;
      const maxDelta = speed * 0.01;

      scene.onPointerObservable.add((eventData) => {
        if (eventData.type != BABYLON.PointerEventTypes.POINTERPICK) {
          return;
        }

        const pickedMesh = eventData.pickInfo?.pickedMesh;
        console.log(pickedMesh);

        if (pickedMesh == null) {
          return;
        }

        if (pickedMesh.name !== "ground") {
          return;
        }

        const pickedPoint = eventData.pickInfo?.pickedPoint;

        if (pickedPoint == null) {
          return;
        }

        targetPoint.copyFrom(pickedPoint);

        const dir = targetPoint.subtract(root.position).normalize();
        targetRotation.copyFrom(
          BABYLON.Quaternion.FromLookDirectionLH(dir, BABYLON.Vector3.Up())
        );
      });

      const pressedKeys = {};
      const keys = {
        KeyW: -1,
        KeyS: 1,
        KeyA: -1,
        KeyD: 1,
      };

      const axis = {
        forward: 0,
        right: 0,
      };

      scene.onKeyboardObservable.add((eventData) => {
        const code = eventData.event.code;

        const getKey = (c) => {
          return !!pressedKeys[c] ? keys[c] : 0;
        };

        if (eventData.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
          pressedKeys[code] = 1;
        } else if (eventData.type === BABYLON.KeyboardEventTypes.KEYUP) {
          pressedKeys[code] = 0;
        }

        axis.forward = getKey("KeyW") + getKey("KeyS");
        axis.right = getKey("KeyA") + getKey("KeyD");

        console.log(axis);
      });

      scene.onBeforeRenderObservable.add(() => {
        const deltaTime = (scene.deltaTime ?? 1) / 1000;

        if (Math.abs(axis.forward) > 0.001) {
          const nextPoint = root.position.add(
            root.forward.scale(axis.forward * 0.3)
          );
          targetPoint.copyFrom(nextPoint);
        }

        if (Math.abs(axis.right) > 0.001) {
          targetRotation.multiplyInPlace(
            BABYLON.Quaternion.RotationAxis(
              root.up,
              axis.right * rotAmount * deltaTime
            )
          );
        }

        BABYLON.Quaternion.SlerpToRef(
          root.rotationQuaternion,
          targetRotation,
          rotLerpSpeed * deltaTime,
          root.rotationQuaternion
        );

        const diff = targetPoint.subtract(root.position);

        if (diff.length() < maxDelta) {
          playIdle();
          return;
        }

        playWalk();

        const dir = diff.normalize();
        const velocity = dir.scaleInPlace(speed * deltaTime);
        root.position.addInPlace(velocity);
      });
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
