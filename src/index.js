import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "./styles.css";

import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { stencil: false });

const MAP_SIZE = 1_000;

window.addEventListener("resize", () => {
  engine.resize();
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

function createScene() {
  const scene = new BABYLON.Scene(engine);

  // camera
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
  camera.upperRadiusLimit = 500;

  // light
  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  light.intensity = 1;
  light.specular = new BABYLON.Color3(0, 0, 0);

  // ground
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: MAP_SIZE, height: MAP_SIZE },
    scene
  );
  const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
  // groundMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.4);
  const groundTexture = new BABYLON.Texture("./grass.jpg", scene);
  groundTexture.uScale = 20;
  groundTexture.vScale = 20;
  groundMaterial.diffuseTexture = groundTexture;
  // groundMaterial.wireframe = true
  ground.material = groundMaterial;

  // cubes model
  const cubes = BABYLON.LoadAssetContainerAsync("./cubes.gltf", scene)
    .then((container) => {
      const [root] = container.meshes;
      root.scaling.setAll(1);
      root.position.x = 10;
      container.addAllToScene();
    })
    .catch((error) => {
      console.error("Error loading model:", error);
    });

  // tree model
  const tree = BABYLON.LoadAssetContainerAsync("./tree.glb", scene)
    .then((container) => {
      const [root] = container.meshes;
      root.scaling.setAll(1);
      root.position.x = -10;
      // container.addAllToScene();

      const childMeshes = root.getChildMeshes(false);
      const merged = BABYLON.Mesh.MergeMeshes(
        childMeshes,
        true,
        true,
        undefined,
        false,
        false
      );
      merged.isPickable = false;
      merged.checkCollisions = false;

      const COUNT = 2_000;
      const offset = 10;
      const max = MAP_SIZE / 2 - 2 - offset;

      const getPos = () =>
        (offset + Math.random() * max) * (Math.random() > 0.5 ? 1 : -1);

      for (let i = 0; i < COUNT; i++) {
        const clone = merged.createInstance("inst_" + i);
        const x = getPos();
        const z = getPos();
        clone.position.set(x, 0, z);
        clone.rotate(root.up, BABYLON.Scalar.RandomRange(1, 180));
        clone.scaling.setAll(BABYLON.Scalar.RandomRange(0.5, 2));
        clone.freezeWorldMatrix();
        clone.material.freeze();
        clone.alwaysSelectAsActiveMesh = true;
      }

      // const bufferMatrices = new Float32Array(16 * COUNT);
      // for (let i = 0; i < COUNT; i++) {
      //   const x = getPos();
      //   const z = getPos();
      //   // origin.x = x;
      //   // origin.z = z;
      //   // const result = scene.pickWithRay(ray, (mesh) => mesh === ground);
      //   // const y = result.pickedPoint?.y ?? 0;
      //   const pos = new BABYLON.Vector3(x, 0, z);
      //   const scale = BABYLON.Vector3.One().setAll(
      //     BABYLON.Scalar.RandomRange(2, 10)
      //   );
      //   const angle = BABYLON.Scalar.RandomRange(0, 2 * Math.PI);
      //   const rot = BABYLON.Quaternion.FromEulerAngles(0, angle, 0);
      //   const matrix = BABYLON.Matrix.Compose(scale, rot, pos);
      //   matrix.copyToArray(bufferMatrices, i * 16);
      // }
      // merged.thinInstanceSetBuffer("matrix", bufferMatrices, 16, true);
    })
    .catch((error) => {
      console.error("Error loading model:", error);
    });

  // cat model
  const cat = BABYLON.LoadAssetContainerAsync("./cat.glb", scene)
    .then((container) => {
      const [root] = container.meshes;
      root.scaling.setAll(1);
      container.addAllToScene();
      root.rotationQuaternion = BABYLON.Quaternion.Identity();

      playIdle(container);

      const targetPoint = root.position.clone();
      const targetRotation = root.rotationQuaternion.clone();

      const speed = 10;
      const rotLerpSpeed = 10;
      const rotAmount = 4;
      const maxDelta = speed * 0.01;

      const pressedKeys = {};
      const axis = {
        forward: 0,
        right: 0,
      };

      scene.onKeyboardObservable.add((eventData) => {
        const code = eventData.event.code;

        if (eventData.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
          pressedKeys[code] = true;
        } else if (eventData.type === BABYLON.KeyboardEventTypes.KEYUP) {
          pressedKeys[code] = false;
        }

        axis.forward = (pressedKeys.KeyW ? -1 : 0) + (pressedKeys.KeyS ? 1 : 0);
        axis.right = (pressedKeys.KeyA ? -1 : 0) + (pressedKeys.KeyD ? 1 : 0);
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
          playIdle(container);
          return;
        }

        playWalk(container);

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

function playIdle(container) {
  container.animationGroups.find((group) => group.name === "idle").start(true);
}

function playWalk(container) {
  container.animationGroups.find((group) => group.name === "walk").play();
}
