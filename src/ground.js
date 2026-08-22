import * as BABYLON from "@babylonjs/core";

export function createGround(scene, options = {}) {
  options = { ...{ name: "ground" }, ...options };
  const ground = BABYLON.MeshBuilder.CreateGround(
    options.name,
    { width: options.size, height: options.size },
    scene,
  );
  const material = new BABYLON.StandardMaterial("material", scene);
  const texture = new BABYLON.Texture(
    "./ground.png",
    scene,
    false,
    false,
    BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
  );

  texture.uScale = 32;
  texture.vScale = 32;
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
    scene,
  );
}
