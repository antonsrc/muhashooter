import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/inspector";
import "./styles.css";

import { createGround } from "./ground.js";

const ground = {
  size: 2000,
};

setupEventListeners();

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, false, { stencil: false }, true);
const scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

function createScene() {
  const scene = new BABYLON.Scene(engine);

  /* camera */
  const cameraHeight = 5;
  const cameraRadius = 15;
  const cameraAlpha = Math.PI / 2;
  const cameraBeta = Math.PI / 2 - 0.3;
  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    cameraAlpha,
    cameraBeta,
    cameraRadius,
    new BABYLON.Vector3(0, cameraHeight, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 500;
  camera.lowerBetaLimit = 0;
  camera.upperBetaLimit = Math.PI / 2;

  /* light */
  const light = new BABYLON.DirectionalLight(
    "directLight",
    new BABYLON.Vector3(-1, -2, -1),
    scene
  );
  light.intensity = 2;
  const hemisphericLight = new BABYLON.HemisphericLight(
    "hemisphericLight",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  hemisphericLight.diffuse = new BABYLON.Color3(1, 1, 1);
  hemisphericLight.intensity = 0.5;

  const shadowGenerator = new BABYLON.CascadedShadowGenerator(2048, light);
  shadowGenerator.cascadeCount = 3;
  shadowGenerator.lambda = 0.95;
  shadowGenerator.quality = BABYLON.ShadowGenerator.QUALITY_LOW;
  shadowGenerator.bias = 0.001;
  shadowGenerator.normalBias = 0.01;

  /* ground */
  createGround(scene, { size: ground.size });

  /* cubes */
  BABYLON.LoadAssetContainerAsync("./cubes.gltf", scene)
    .then((container) => {
      const [rootCubes] = container.meshes;
      rootCubes.scaling.setAll(3);
      rootCubes.position.x = 10;

      shadowGenerator.addShadowCaster(rootCubes);

      container.addAllToScene();
    })
    .catch((error) => {
      console.error("Error loading model:", error);
    });

  /* cat */
  const cat = BABYLON.LoadAssetContainerAsync("./cat.glb", scene)
    .then((container) => {
      const [rootCat] = container.meshes;
      rootCat.scaling.setAll(1);
      playIdle(container);

      rootCat.getChildMeshes().forEach((mesh) => {
        mesh.receiveShadows = true;
        if (mesh.material && mesh.material instanceof BABYLON.PBRMaterial) {
          mesh.material.specularColor = BABYLON.Color3.Black();
          mesh.material.roughness = 1.0;
          mesh.material.metallic = 0.0;
        }
      });

      shadowGenerator.addShadowCaster(rootCat);

      rootCat.rotationQuaternion = BABYLON.Quaternion.Identity();

      const targetPoint = rootCat.position.clone();
      const targetRotation = rootCat.rotationQuaternion.clone();

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
          const nextPoint = rootCat.position.add(
            rootCat.forward.scale(axis.forward * 0.3)
          );
          targetPoint.copyFrom(nextPoint);
        }

        if (Math.abs(axis.right) > 0.001) {
          targetRotation.multiplyInPlace(
            BABYLON.Quaternion.RotationAxis(
              rootCat.up,
              axis.right * rotAmount * deltaTime
            )
          );
        }

        BABYLON.Quaternion.SlerpToRef(
          rootCat.rotationQuaternion,
          targetRotation,
          rotLerpSpeed * deltaTime,
          rootCat.rotationQuaternion
        );

        const diff = targetPoint.subtract(rootCat.position);

        if (diff.length() < maxDelta) {
          playIdle(container);
          return;
        }

        playWalk(container);

        const dir = diff.normalize();
        const velocity = dir.scaleInPlace(speed * deltaTime);
        rootCat.position.addInPlace(velocity);
      });

      container.addAllToScene();
    })
    .catch((error) => {
      console.error("Error loading model:", error);
    });

  /* tree */
  BABYLON.LoadAssetContainerAsync("./tree.glb", scene)
    .then((container) => {
      const [rootTree] = container.meshes;
      rootTree.scaling.setAll(1);
      rootTree.position.x = -10;

      const childMeshes = rootTree.getChildMeshes(false);
      const merged = BABYLON.Mesh.MergeMeshes(
        childMeshes,
        true,
        true,
        undefined,
        false,
        false
      );

      shadowGenerator.addShadowCaster(merged);

      const COUNT = 2_000;
      const offset = 10;
      const max = ground.size / 2 - 2 - offset;

      const getPos = () =>
        (offset + Math.random() * max) * (Math.random() > 0.5 ? 1 : -1);

      for (let i = 0; i < COUNT; i++) {
        const instance = merged.createInstance("treeInstance_" + i);
        const x = getPos();
        const z = getPos();

        instance.position.set(x, 0, z);
        instance.rotate(rootTree.up, BABYLON.Scalar.RandomRange(1, 180));
        instance.scaling.setAll(BABYLON.Scalar.RandomRange(0.5, 2));
        instance.freezeWorldMatrix();
        instance.material.freeze();
        instance.alwaysSelectAsActiveMesh = true;
        shadowGenerator.addShadowCaster(instance);
      }
    })
    .catch((error) => {
      console.error("Error loading model:", error);
    });

  return scene;
}

function playIdle(container) {
  container.animationGroups.find((group) => group.name === "idle").start(true);
}

function playWalk(container) {
  container.animationGroups.find((group) => group.name === "walk").play();
}

function setupEventListeners() {
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
}
