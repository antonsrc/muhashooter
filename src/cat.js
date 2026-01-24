import * as BABYLON from "@babylonjs/core";
import {
  setAnimation,
  setAnimationBlending,
  getAnimationGroups,
  setRoughnessMaterial,
} from "./utils.js";

let inputDirection = BABYLON.Vector3.Zero();

let isMoving = false;
let isRun = false;

let state = "IN_AIR";
let wantJump = false;
let upWorld = BABYLON.Vector3.Up();

let speed = 1;
let inAirSpeed = 8.0;
let onGroundSpeed = 10.0;
let jumpHeight = 12;
let characterGravity = new BABYLON.Vector3(0, -18, 0);

export async function loadCat(scene, shadows, pressedKeys, camera) {
  const catGlb = await BABYLON.LoadAssetContainerAsync("./cat.glb", scene);
  const [meshes] = catGlb.meshes;
  const rootContainer = new BABYLON.TransformNode("rootContainer", scene);
  meshes.parent = rootContainer;
  camera.parent = rootContainer;

  const animations = getAnimationGroups(catGlb, [
    "walk",
    "idle",
    "run",
    "jump",
  ]);
  await setAnimationBlending(catGlb);
  await setAnimation("idle", ["walk", "run", "jump"], animations);

  shadows.addShadowCaster(meshes);
  // await setRoughnessMaterial(meshes);
  catGlb.addAllToScene();

  const catHeight = 6;
  meshes.position.set(0, -catHeight / 2, 0);

  let catController = new BABYLON.PhysicsCharacterController(
    new BABYLON.Vector3(0, catHeight / 2, 0),
    { capsuleHeight: catHeight, capsuleRadius: 1.4 },
    scene
  );

  scene.onBeforePhysicsObservable.add(() => {
    if (scene.deltaTime == undefined) return; // зачем
    let deltaTime = scene.deltaTime / 1000.0; // зачем
    if (deltaTime == 0) return; // зачем

    const cameraForward = getCameraForwardDirection(camera);
    const cameraRight = getCameraRightDirection(camera);
    inputDirection = BABYLON.Vector3.Zero();
    if (pressedKeys.KeyW) {
      isMoving = true;
      inputDirection.addInPlace(cameraForward);
    }
    if (pressedKeys.KeyS) {
      isMoving = true;
      inputDirection.addInPlace(cameraForward.scale(-1));
    }
    if (pressedKeys.KeyD) {
      isMoving = true;
      inputDirection.addInPlace(cameraRight);
    }
    if (pressedKeys.KeyA) {
      isMoving = true;
      inputDirection.addInPlace(cameraRight.scale(-1));
    }

    if (
      !pressedKeys.KeyW &&
      !pressedKeys.KeyA &&
      !pressedKeys.KeyS &&
      !pressedKeys.KeyD
    ) {
      isMoving = false;
    }

    inputDirection.normalize();

    if (pressedKeys.Space) {
      wantJump = true;
    } else {
      wantJump = false;
    }

    if (pressedKeys.ShiftLeft) {
      isRun = true;
      speed = 3;
    } else {
      isRun = false;
      speed = 1;
    }

    if (inputDirection.length() > 0.1) {
      const targetRotation = BABYLON.Quaternion.FromLookDirectionLH(
        inputDirection,
        BABYLON.Axis.Y
      );

      BABYLON.Quaternion.SlerpToRef(
        meshes.rotationQuaternion,
        targetRotation,
        10 * deltaTime,
        meshes.rotationQuaternion
      );
    }

    if (state == "ON_GROUND" && isMoving) {
      setAnimation("walk", ["idle", "run", "jump"], animations);
    } else if (state == "START_JUMP") {
      setAnimation("jump", ["idle", "run", "walk"], animations);
    } else if (state == "ON_GROUND" && !isMoving) {
      setAnimation("idle", ["walk", "run", "jump"], animations);
    }

    let support = catController.checkSupport(deltaTime, BABYLON.Vector3.Down());
    state = getState(support);
    let desiredLinearVelocity = getDesiredVelocity(
      deltaTime,
      catController.getVelocity(),
      state
    );
    catController.setVelocity(desiredLinearVelocity);
    catController.integrate(deltaTime, support, characterGravity);
    meshes.parent.position.copyFrom(catController.getPosition());
  });
}

function getCameraForwardDirection(camera) {
  const forward = camera.getForwardRay().direction;
  return new BABYLON.Vector3(forward.x, 0, forward.z).normalize();
}

function getCameraRightDirection(camera) {
  const forward = getCameraForwardDirection(camera);
  return BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), forward).normalize();
}

function getState(supportInfo) {
  const supportedState =
    supportInfo.supportedState == BABYLON.CharacterSupportedState.SUPPORTED;
  const unsupportedState =
    supportInfo.supportedState == BABYLON.CharacterSupportedState.UNSUPPORTED;

  if (supportedState && !wantJump) {
    return "ON_GROUND";
  } else if (supportedState && wantJump) {
    return "START_JUMP";
  } else if (unsupportedState) {
    return "IN_AIR";
  } else {
    return state;
  }
}

function getDesiredVelocity(deltaTime, currentVelocity, state) {
  let desiredVelocity = BABYLON.Vector3.Zero();
  if (state == "IN_AIR") {
    desiredVelocity = inputDirection
      .scale(inAirSpeed * speed)
      .addInPlace(upWorld.scale(currentVelocity.dot(upWorld)))
      .addInPlace(characterGravity.scale(deltaTime));
  } else if (state == "ON_GROUND") {
    desiredVelocity = inputDirection.scale(onGroundSpeed * speed);
  } else if (state == "START_JUMP") {
    desiredVelocity = inputDirection
      .scale(inAirSpeed * speed)
      .addInPlace(upWorld.scale(jumpHeight));
  }
  return desiredVelocity;
}
