import * as BABYLON from "@babylonjs/core";

export function createGround(scene, options = {}) {
  options = { ...{ name: "ground" }, ...options };
  // const ground = BABYLON.MeshBuilder.CreateGround(
  //   options.name,
  //   { width: options.size, height: options.size },
  //   scene
  // );

  let ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
    "ground",
    "heightMap.jpg",
    {
      width: options.size,
      height: options.size,
      maxHeight: 100,
      subdivisions: 40,
      onReady: (mesh) => {
        new BABYLON.PhysicsAggregate(
          mesh,
          BABYLON.PhysicsShapeType.MESH,
          { mass: 0 },
          scene
        );
      },
    }
  );

  const material = new BABYLON.StandardMaterial("material", scene);
  const texture = new BABYLON.Texture(
    "./tempGround.png",
    scene,
    false,
    false,
    BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE
  );

  texture.uScale = 128;
  texture.vScale = 128;
  material.diffuseTexture = texture;
  material.specularColor = BABYLON.Color3.Black();
  material.roughness = 1.0;
  material.metallic = 0.0;
  ground.receiveShadows = true;
  ground.material = material;

  new BABYLON.PhysicsAggregate(
    ground,
    BABYLON.PhysicsShapeType.BOX,
    { mass: 0 },
    scene
  );
}
