import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
const bundle = await build({
  stdin: {
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{VpDeclarationEditor}from'./src/components/orders/VpDeclarationEditor';const root=createRoot(document.getElementById('root'));window.render=(country='US')=>root.render(<VpDeclarationEditor key={country} country={country} items={[{id:'a',sku:'SKU-A',name:'Source A',quantity:2},{id:'b',sku:null,name:'Source B',quantity:1}]} onChange={value=>window.result=value}/>);window.render();`,
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
          contents: `export const apiFetch=async(url,options)=>{if(options?.method==='PUT'){window.saved.push(JSON.parse(options.body));return{data:{}};}return await window.mappingResponse;};`,
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
    window.saved = [];
    window.mappingResponse = new Promise(
      (resolve) => (window.resolveMapping = resolve),
    );
  });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const nameA = page.getByLabel("Tên khai báo VP a", { exact: true }),
    codeA = page.getByLabel("Mã merchandise VP a", { exact: true });
  assert.equal(await nameA.isVisible(), false);
  await page.getByText("Chỉnh riêng lần gửi này", {exact:true}).click();
  await nameA.fill("Custom wooden ornament");
  await codeA.fill("442199");
  await page.evaluate(() =>
    window.resolveMapping({
      data: {
        mappings: [
          {
            skuCode: "SKU-A",
            declarationName: "Old saved name",
            merchandiseCode: "610910",
            destinationCountryCode: "US",
          },
        ],
      },
    }),
  );
  assert.equal(await nameA.inputValue(), "Custom wooden ornament");
  await page
    .getByLabel("Tên khai báo VP b", { exact: true })
    .fill("Wooden sign");
  await page.getByLabel("Mã merchandise VP b", { exact: true }).fill("610910");
  await page.waitForFunction(() =>
    window.result?.issue?.includes("nhiều nhóm"),
  );
  await page.getByLabel("Mã merchandise VP b", { exact: true }).fill("442199");
  await page.waitForFunction(() => window.result?.issue === null);
  const saves = page.getByRole("button", { name: "Lưu mapping", exact: true });
  assert.equal(
    await saves.nth(1).isDisabled(),
    true,
    "no-SKU declaration cannot create reusable mapping",
  );
  await saves.first().click();
  await page.waitForFunction(() => window.saved.length === 1);
  assert.deepEqual(await page.evaluate(() => window.saved[0]), {
    mappingType: "SKU",
    skuCode: "SKU-A",
    destinationCountryCode: "US",
    declarationName: "Custom wooden ornament",
    merchandiseCode: "442199",
  });
  await page.evaluate(() => {
    window.mappingResponse = Promise.resolve({ data: { mappings: [] } });
    window.render("AU");
  });
  await page.waitForFunction(
    () => window.result?.country === "AU" && window.result.issue !== null,
  );
  assert.equal(await nameA.inputValue(), "");
  assert.equal(await codeA.inputValue(), "");
  await page.evaluate(()=>{
    window.mappingResponse=Promise.resolve({data:{mappings:[{skuCode:"SKU-A",mappingType:"GROUP",matchedKey:"ACO",declarationName:"Acrylic ornament",merchandiseCode:"392640",destinationCountryCode:"US"}]}});
    window.render("US");
  });
  await page.getByText("Chỉnh riêng lần gửi này",{exact:true}).click();
  await page.getByText("Mapping: Nhóm ACO",{exact:true}).waitFor();
  assert.equal(await nameA.inputValue(),"Acrylic ornament");
  assert.deepEqual(errors, []);
  console.log(
    "PASS declaration UI: no guesses, manual overrides, late lookup preserves edits, save mapping, no-SKU and mixed-country guards",
  );
} finally {
  await browser.close();
}
