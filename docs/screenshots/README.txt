Device screenshots for the user manual live in the manual/ subfolder (numbered PNGs).

- Refresh copies from exported WhatsApp assets: from the repo root run `npm run manual:screenshots`
  (optional env `MANUAL_SCREENSHOT_SRC` if your PNGs are not in the default sibling assets folder).
- Filenames: `01-welcome.png` … `16-vendor-my-tasks-updated.png`, plus `extra-create-task-electrical.png`.
- Markdown references: `docs/Kickstart-Vendor-Hub-User-Manual.md`
- PDF print source: `docs/Kickstart-Vendor-Hub-User-Manual-Print.html` → `npm run manual:pdf`
