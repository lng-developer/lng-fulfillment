import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
const bundle = await build({
  stdin: {
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{VpMerchandiseTab}from'./src/components/settings/VpMerchandiseTab';createRoot(document.getElementById('root')).render(<VpMerchandiseTab/>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  jsx: "automatic",
  plugins: [
    {
      name: "mock",
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/api\/base$/ }, () => ({
          path: "base",
          namespace: "mock",
        }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents: `export const getErrorMessage=e=>e.message;export async function apiFetch(url,o={}){window.calls.push({url,...o});if(o.method){const m=JSON.parse(o.body);if(o.method==='POST'){if(window.rows.some(r=>r.skuCode===m.skuCode))throw Error('Duplicate SKU');window.rows.push(m);}if(o.method==='PUT')window.rows=window.rows.map(r=>r.skuCode===m.skuCode?m:r);if(o.method==='DELETE')window.rows=window.rows.filter(r=>r.skuCode!==m.skuCode);return{data:{}};}const q=new URL(url,'http://test').searchParams.get('search');const rows=window.rows.filter(r=>!q||r.skuCode.includes(q));return{data:{mappings:rows,total:rows.length}};}`,
        }));
      },
    },
  ],
});
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent('<div id="root"></div>');
  await page.evaluate(() => {
    window.rows = [];
    window.calls = [];
  });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.getByRole("button", { name: "Thêm mapping", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("SKU", { exact: true }).fill("SKU-A");
  await dialog
    .getByLabel("Tên khai báo", { exact: true })
    .fill("Wooden ornament");
  await dialog.getByLabel("Mã merchandise/HS", { exact: true }).fill("442199");
  await dialog
    .getByRole("button", { name: "Lưu mapping", exact: true })
    .click();
  await page.getByRole("cell", { name: "SKU-A", exact: true }).waitFor();
  await page.getByRole("button", { name: "Sửa", exact: true }).click();
  assert.equal(
    await dialog.getByLabel("SKU", { exact: true }).getAttribute("readonly"),
    "",
  );
  await dialog.getByLabel("Tên khai báo", { exact: true }).fill("Wooden sign");
  await dialog
    .getByRole("button", { name: "Lưu mapping", exact: true })
    .click();
  await page.getByRole("cell", { name: "Wooden sign", exact: true }).waitFor();
  await page.getByLabel("Tìm mapping", { exact: true }).fill("UNKNOWN");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await page.getByText("Chưa có mapping phù hợp.", { exact: false }).waitFor();
  await page.getByLabel("Tìm mapping", { exact: true }).fill("");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await page.getByRole("button", { name: "Xóa", exact: true }).click();
  assert.equal(await page.evaluate(() => window.rows.length), 1);
  await page.getByRole("button", { name: "Xóa mapping", exact: true }).click();
  await page.waitForFunction(() => window.rows.length === 0);
  await page.getByRole("button", { name: "Thêm mapping", exact: true }).click();
  await dialog
    .getByLabel("Loại mapping", { exact: true })
    .selectOption("GROUP");
  await dialog.getByLabel("Mã nhóm SKU", { exact: true }).fill("aco");
  assert.equal(
    await dialog.getByLabel("Mã nhóm SKU", { exact: true }).inputValue(),
    "ACO",
  );
  await dialog
    .getByLabel("Tên khai báo", { exact: true })
    .fill("Acrylic Christmas ornament");
  await dialog.getByLabel("Mã merchandise/HS", { exact: true }).fill("392640");
  await dialog
    .getByRole("button", { name: "Lưu mapping", exact: true })
    .click();
  await page.getByRole("cell", { name: "ACO", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.rows[0].mappingType), "GROUP");
  await page.getByRole("button", { name: "Sửa", exact: true }).click();
  assert.equal(
    await dialog.getByLabel("Loại mapping", { exact: true }).isDisabled(),
    true,
  );
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.getByRole("button", { name: "Xóa", exact: true }).click();
  await page.getByRole("button", { name: "Xóa mapping", exact: true }).click();
  await page.waitForFunction(() => window.rows.length === 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS mapping CRUD UI: create, read, search, edit immutable key, confirm delete",
  );
} finally {
  await browser.close();
}
