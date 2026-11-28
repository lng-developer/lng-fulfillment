import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

// Verify every newly wired surface uses the shared handler, including all three preparation dialogs.
const surfaces = {
  "layout/ChangePasswordDialog": 1,
  "ui/ConfirmationModal": 1,
  "shipments/LiveActionConfirmation": 1,
  "shipments/ShipmentExecutionPreparation": 3,
  "settings/ApiKeysTab": 1,
  "settings/CarrierAccountsTab": 2,
  "settings/CredentialForm": 1,
  "settings/EditMemberModal": 1,
  "settings/ApiKeyRevealModal": 1,
  "orders/PrintLabelModal": 1,
  "orders/CancelOrderModal": 1,
};
for (const [file, count] of Object.entries(surfaces)) {
  const source = readFileSync(`src/components/${file}.tsx`, "utf8");
  assert.equal((source.match(/onMouseDown=\{\(event\) => dismissOnBackdrop/g) || []).length, count, file);
}
const bundle = await build({
  stdin: {
    contents: `import React,{useEffect,useRef,useState}from'react';import{createRoot}from'react-dom/client';
import{ConfirmationModal}from'./src/components/ui/ConfirmationModal';
import{ApiKeyRevealModal}from'./src/components/settings/ApiKeyRevealModal';
import{dismissOnBackdrop}from'./src/lib/modal-backdrop';
function Native(){const ref=useRef(null);useEffect(()=>ref.current.showModal(),[]);return <dialog ref={ref} style={{width:300,height:150,padding:30}} onMouseDown={e=>dismissOnBackdrop(e,()=>window.closedCount++)}><button>Inside native</button></dialog>}
function App(){const[mode,setMode]=useState('confirm');window.show=setMode;const close=()=>{window.closedCount++;setMode('')};return mode==='confirm'?<ConfirmationModal title="Confirm test" description="Details" confirmLabel="Submit" variant="default" onCancel={close} onConfirm={()=>new Promise(resolve=>window.finish=resolve)}/>:mode==='reveal'?<ApiKeyRevealModal plaintext="test-value" onClose={close}/>:mode==='native'?<Native/>:null};createRoot(document.getElementById('root')).render(<App/>);`,
    resolveDir: process.cwd(), loader: "tsx",
  }, bundle: true, write: false, jsx: "automatic",
});
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setContent('<div id="root"></div>');
  await page.evaluate(() => { window.closedCount = 0; });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.getByText("Details", { exact: true }).click();
  assert.equal(await page.evaluate(() => window.closedCount), 0);
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("dialog").dispatchEvent("mousedown", { button: 0 });
  assert.equal(await page.evaluate(() => window.closedCount), 0, "pending confirmation must remain open");
  await page.evaluate(() => window.finish());
  await page.getByRole("button", { name: "Submit", exact: true }).waitFor();
  await page.getByRole("dialog").dispatchEvent("mousedown", { button: 2 });
  assert.equal(await page.evaluate(() => window.closedCount), 0, "right click must not close");
  await page.getByRole("dialog").dispatchEvent("mousedown", { button: 0 });
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => window.closedCount), 1);
  await page.evaluate(() => window.show('reveal'));
  await page.getByRole("dialog").dispatchEvent("mousedown", { button: 0 });
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => window.closedCount), 2);
  await page.evaluate(() => window.show('native'));
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const box = await dialog.boundingBox();
  await page.mouse.click(box.x + 5, box.y + 5);
  await page.getByRole("button", { name: "Inside native" }).click();
  assert.equal(await page.evaluate(() => window.closedCount), 2, "native padding/content must remain open");
  await page.mouse.click(5, 5);
  assert.equal(await page.evaluate(() => window.closedCount), 3, "native backdrop closes");
  assert.deepEqual(errors, []);
  console.log("PASS modal coverage, inner clicks, pending guard, right click and native dialog backdrop/padding");
} finally { await browser.close(); }
