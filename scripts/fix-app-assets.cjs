/**
 * Source logo was JPEG bytes saved as .png (invalid for Android resource pipeline).
 * Emit valid square PNG icon + splash PNG for Expo / Gradle.
 *
 * Optionally fixes legacy kickstart-logo.png in-place when writable (Metro bundles it for release).
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "assets", "images", "kickstart-logo.png");
const outIcon = path.join(root, "assets", "images", "app-icon.png");
const outSplash = path.join(root, "assets", "images", "app-splash.png");

const size = 1024;

async function main() {
  try {
    const pngBuf = await sharp(src).png().toBuffer();
    fs.writeFileSync(src, pngBuf);
    console.log("Fixed", src);
  } catch (e) {
    console.warn("Could not rewrite kickstart-logo.png (use app-splash.png in UI):", e.message);
  }

  await sharp(src)
    .resize(size, size, {
      fit: "contain",
      position: "center",
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    })
    .png()
    .toFile(outIcon);

  await sharp(src).png().toFile(outSplash);

  console.log("Wrote", outIcon, outSplash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
