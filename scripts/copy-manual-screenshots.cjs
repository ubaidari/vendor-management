/**
 * Copies WhatsApp/device screenshots into docs/screenshots/manual/ with stable names.
 * Default source: sibling Cursor project folder that holds exported assets.
 *
 * Usage: node scripts/copy-manual-screenshots.cjs
 * Override: set MANUAL_SCREENSHOT_SRC to the folder containing the WhatsApp_Image_*.png files.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const destDir = path.join(root, "docs", "screenshots", "manual");

const defaultSrc =
  process.env.MANUAL_SCREENSHOT_SRC ||
  path.join(
    root,
    "..",
    "..",
    "c-Users-hp-cursor-projects-empty-window-Vendor-management",
    "assets"
  );

const map = [
  ["01-welcome.png", "WhatsApp_Image_2026-05-11_at_5.32.28_PM-c728214b-e773-45b0-b21a-2c151c28ef3e.png"],
  ["02-admin-portal-unlock.png", "WhatsApp_Image_2026-05-11_at_5.32.28_PM__1_-834bc7da-cf16-4087-8a28-25913e953bc2.png"],
  ["03-select-portal.png", "WhatsApp_Image_2026-05-11_at_5.32.28_PM__2_-4064b68d-8d91-450a-ac84-520396584e28.png"],
  ["04-vendor-pins.png", "WhatsApp_Image_2026-05-11_at_5.32.29_PM-00879e11-1d0e-4037-bfbb-2c3f3137a25b.png"],
  ["05-admin-device-password.png", "WhatsApp_Image_2026-05-11_at_5.32.30_PM-e928b339-57b2-4d5e-87b6-98c63565f924.png"],
  ["06-dashboard-operations-overview.png", "WhatsApp_Image_2026-05-11_at_5.32.30_PM__1_-91879194-990f-4735-a464-ff96c22ce414.png"],
  ["07-dashboard-branch-overview.png", "WhatsApp_Image_2026-05-11_at_5.32.30_PM__2_-14b8f767-b37b-4dde-bc5f-c87c1c39d661.png"],
  ["08-dashboard-date-range.png", "WhatsApp_Image_2026-05-11_at_5.32.31_PM__1_-dc6d67aa-c3bc-4e2d-8107-16c4c99f1a98.png"],
  ["09-admin-tasks.png", "WhatsApp_Image_2026-05-11_at_5.32.31_PM-b50bf317-fa66-4c28-a3c5-926208d2a77e.png"],
  ["10-create-task.png", "WhatsApp_Image_2026-05-11_at_5.32.31_PM__2_-bd014b2b-5c4c-46ed-801d-09176bda4289.png"],
  ["11-task-created-success.png", "WhatsApp_Image_2026-05-11_at_5.32.32_PM-5aa1352f-f337-49da-bae0-02479e8fa5c4.png"],
  ["12-vendor-signin.png", "WhatsApp_Image_2026-05-11_at_5.32.32_PM__1_-1f5e2ed4-2427-42e5-bd12-56c723521ab5.png"],
  ["13-vendor-my-tasks.png", "WhatsApp_Image_2026-05-11_at_5.32.32_PM__2_-5b80c6ef-1978-4018-aa5a-4ca0e4719a7e.png"],
  ["14-task-detail-on-hold.png", "WhatsApp_Image_2026-05-11_at_5.32.32_PM__3_-4d4cc2a3-129a-43ed-8ccc-2e4eba333f8b.png"],
  ["15-task-detail-completed.png", "WhatsApp_Image_2026-05-11_at_5.32.33_PM-e3644839-fd28-4954-a445-0b7f1ebeb356.png"],
  ["16-vendor-my-tasks-updated.png", "WhatsApp_Image_2026-05-11_at_5.32.33_PM__1_-dc7a1ea6-a42d-4658-82bd-b7a35bf752c4.png"],
  ["extra-create-task-electrical.png", "WhatsApp_Image_2026-05-11_at_5.32.25_PM-a45a8742-95de-4274-891b-21e95cc879c6.png"],
];

const prefix =
  "c__Users_hp_AppData_Roaming_Cursor_User_workspaceStorage_a522cd918e1c4151fdf08a1fb804b554_images_";

function main() {
  if (!fs.existsSync(defaultSrc)) {
    console.error("Source assets folder not found:", defaultSrc);
    console.error("Set MANUAL_SCREENSHOT_SRC to the folder containing WhatsApp_Image_*.png exports.");
    process.exit(1);
  }
  fs.mkdirSync(destDir, { recursive: true });
  let ok = 0;
  for (const [destName, srcTail] of map) {
    const from = path.join(defaultSrc, prefix + srcTail);
    const to = path.join(destDir, destName);
    if (!fs.existsSync(from)) {
      console.warn("Missing:", from);
      continue;
    }
    fs.copyFileSync(from, to);
    ok++;
    console.log(destName);
  }
  console.log("Copied", ok, "of", map.length, "to", destDir);
}

main();
