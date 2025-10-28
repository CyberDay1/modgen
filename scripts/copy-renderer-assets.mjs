import { copyFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";

async function copyRendererAssets() {
  const source = resolve("src", "renderer", "index.html");
  const destination = resolve("dist", "renderer", "index.html");

  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

copyRendererAssets().catch((error) => {
  console.error("Failed to copy renderer assets", error);
  process.exitCode = 1;
});
