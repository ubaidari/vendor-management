/**
 * Prints docs/Kickstart-Vendor-Hub-User-Manual-Print.html to PDF (Chromium).
 * Usage: node scripts/generate-manual-pdf.cjs
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

const root = path.join(__dirname, "..");
const htmlPath = path.join(root, "docs", "Kickstart-Vendor-Hub-User-Manual-Print.html");
const pdfPath = path.join(root, "docs", "Kickstart-Vendor-Hub-User-Manual.pdf");

/** Minimal inline styles — Chromium PDF header/footer require explicit sizing */
const footerTemplate = `
  <div style="width:100%; font-size:9px; font-family:Segoe UI,Roboto,Arial,sans-serif; color:#6b7280; padding:0 12mm; box-sizing:border-box;">
    <table style="width:100%; border-collapse:collapse;"><tr>
      <td style="text-align:left; width:33%;">Kickstart Vendor Hub · Operations Manual</td>
      <td style="text-align:center; width:34%;">Internal use</td>
      <td style="text-align:right; width:33%;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></td>
    </tr></table>
  </div>
`;

async function main() {
  if (!fs.existsSync(htmlPath)) {
    console.error("Missing:", htmlPath);
    process.exit(1);
  }
  const fileUrl = pathToFileURL(htmlPath).href;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(fileUrl, { waitUntil: "networkidle" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate,
    margin: { top: "12mm", bottom: "18mm", left: "14mm", right: "14mm" },
  });
  await browser.close();
  console.log("Wrote", pdfPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
