import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  validateVpPdfUrl,
  validateLabelBatch,
  combineLabelPdfs,
  readVpPdf,
} from "@/modules/shipment/batch-labels";
async function main() {
  for (const url of [
    "http://x.cloudfront.net/a",
    "https://localhost/a",
    "https://x.cloudfront.net.evil.test/a",
    "https://user:pass@x.cloudfront.net/a",
    "https://127.0.0.1/a",
  ])
    assert.throws(() => validateVpPdfUrl(url));
  assert.equal(
    validateVpPdfUrl("https://x.cloudfront.net/a.pdf"),
    "https://x.cloudfront.net/a.pdf",
  );
  assert.throws(() => validateLabelBatch({ shipmentIds: [], mode: "single" }));
  assert.throws(() =>
    validateLabelBatch({ shipmentIds: Array(11).fill("a"), mode: "single" }),
  );
  assert.deepEqual(
    validateLabelBatch({ shipmentIds: ["a", "a"], mode: "double" }).shipmentIds,
    ["a"],
  );
  let checked = false;
  await readVpPdf("https://x.cloudfront.net/a.pdf", async (_url, options) => {
    checked = options?.redirect === "error";
    return new Response(new Uint8Array([1]));
  });
  assert.ok(checked);
  const a = await PDFDocument.create();
  a.addPage([298, 420]);
  const b = await PDFDocument.create();
  b.addPage([420, 596]);
  const merged = await PDFDocument.load(
    await combineLabelPdfs([await a.save(), await b.save()]),
  );
  assert.equal(merged.getPageCount(), 2);
  assert.equal(merged.getPage(0).getWidth(), 298);
  assert.equal(merged.getPage(1).getHeight(), 596);
  await assert.rejects(() => combineLabelPdfs([new Uint8Array([1, 2])]));
  console.log(
    "PASS PDF merge dimensions, validation, URL guards, redirect blocking",
  );
}
void main();
