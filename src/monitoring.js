import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";

export function createMonitoring(scene, engine) {
  let sceneInstr = new BABYLON.SceneInstrumentation(scene);
  let engineInstrumentation = new BABYLON.EngineInstrumentation(engine);
  engineInstrumentation.captureShaderCompilationTime = true;

  function addTextBlock(panel, params) {
    const textBlock = new GUI.TextBlock();
    textBlock.resizeToFit = true;
    textBlock.color = "white";
    textBlock.horizontalAlignment = 0;

    if (params?.fontSize) {
      textBlock.fontSize = params.fontSize;
    } else {
      textBlock.fontSize = "2%";
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
  const fpsValue = addTextBlock(panel, { fontWeight: "bold", fontSize: "3%" });

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
}
