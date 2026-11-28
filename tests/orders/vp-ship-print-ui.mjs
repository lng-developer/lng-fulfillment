import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
const bundle = await build({
  stdin: {
    contents: `import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{VpBatchShipModal}from'./src/components/orders/VpBatchShipModal';import{ShipOrderModal}from'./src/components/orders/ShipOrderModal';import{useVpShipping,VpShippingProgress}from'./src/components/orders/VpShippingProgress';
const orders=['a','b','c'].map(id=>({id,externalOrderId:id,recipientName:'Test',totalQuantity:1,status:'READY_TO_SHIP',destinationCountry:'US'}));
function App(){const[modal,setModal]=useState('batch');const flow=useVpShipping(()=>{});return <><button onClick={()=>setModal('batch')}>Batch</button><button onClick={()=>setModal('single')}>Single</button>{modal==='batch'&&<VpBatchShipModal initialDetails={{a:{recipientPhone:'+12107284548',items:[{id:'ia',sku:'SKU-a',name:'Wooden ornament',quantity:1}]}}} orders={orders} onClose={()=>setModal('')} onSubmit={(input,auto,mode)=>{setModal('');void flow.start(input,auto,mode);}}/>}{modal==='single'&&<ShipOrderModal order={orders[0]} detail={{recipientPhone:'+12107284548',items:[{id:'ia',sku:'SKU-a',name:'Wooden ornament',quantity:1}]}} onClose={()=>setModal('')} onSubmit={input=>{setModal('');void flow.start([{orderId:'single',orderNumber:'Single',options:input.options,environment:input.environment,carrierAccountId:input.carrierAccountId}],input.autoPrint,input.labelMode);}}/>}<VpShippingProgress flow={flow}/></>};createRoot(document.getElementById('root')).render(<App/>);`,
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
        b.onResolve(
          {
            filter:
              /^@\/lib\/api\/(orders|shipments|carrier-accounts|shipment-automation|base)$/,
          },
          (args) => ({ path: args.path.split("/").pop(), namespace: "mock" }),
        );
        b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
          contents: {
            orders: `export const getOrder=async id=>{window.detailCalls.push(id);await window.detailsReady;return{recipientPhone:id==='c'?'':'+12107284548',items:[{id:'i'+id,sku:'SKU-'+id,name:'Wooden ornament',quantity:1}]}};export const shipOrder=async(id,environment,options,carrier,account)=>{window.sent.push({id,environment,options,carrier,account});if(id==='b')throw Error('timeout');return{shipment:{id:'s-'+id,status:'TRACKING_PENDING'}};};`,
            shipments: `export const getShipment=async id=>({id,status:'TRACKING_PENDING',labelUrl:window.synced.includes(id)?'https://x.cloudfront.net/'+id+'.pdf':null});export const syncTracking=async id=>{window.synced.push(id);};`,
            "carrier-accounts": `export const getCarrierAccounts=async()=>[{id:'acc1',displayName:'ACC 1',carrierCode:'VIETTEL_POST',status:'ACTIVE',isDefault:true},{id:'acc2',displayName:'ACC 2',carrierCode:'VIETTEL_POST',status:'ACTIVE',isDefault:false}];`,
            "shipment-automation": `export const getTenantYunIossSetting=async()=>({status:'INACTIVE'});`,
            base: `export class ApiError extends Error{};export const getErrorMessage=e=>e.message;export const apiFetch=async(url)=>{if(url.includes('vp-merchandise')&&window.failMappings)throw Error('mapping unavailable');return url.includes('vp-merchandise')?({data:{mappings:['a','b','c'].map(id=>({skuCode:'SKU-'+id,declarationName:'Wooden ornament',merchandiseCode:'442199',destinationCountryCode:'US'}))}}):({data:{labelUrl:'https://x.cloudfront.net/label.pdf',mergeLabelUrl:'https://x.cloudfront.net/double.pdf'}});};`,
          }[args.path],
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
    window.sent = [];
    window.detailCalls = [];
    window.detailsReady = new Promise((resolve) => {
      window.releaseDetails = resolve;
    });
    window.synced = [];
    window.printRequests = [];
    window.open = () => ({
      opener: null,
      closed: false,
      document: { title: "", body: { textContent: "" } },
      location: { href: "" },
      close() {
        this.closed = true;
      },
    });
    window.fetch = async (url, init) => {
      window.printRequests.push(JSON.parse(init.body));
      return new Response("pdf", {
        headers: { "Content-Type": "application/pdf" },
      });
    };
  });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const batch = page.getByRole("dialog", { name: "Gửi VP hàng loạt" });
  await batch.waitFor();
  await batch.getByRole("button", { name: "Chỉnh đơn a", exact: true }).click();
  await batch.getByLabel("weight a", { exact: true }).waitFor();
  assert.equal(
    await batch.getByLabel("weight a", { exact: true }).inputValue(),
    "100",
  );
  await page.waitForFunction(
    () =>
      document.querySelector('select[aria-label="Tài khoản Viettel Post"]')
        ?.value === "acc2",
  );
  assert.deepEqual(await page.evaluate(() => window.detailCalls.sort()), [
    "b",
    "c",
  ]);
  await page.evaluate(() => window.releaseDetails());
  await batch.getByRole("heading", { level: 2 }).click();
  assert.equal(await batch.count(), 1);
  await batch.dispatchEvent("mousedown");
  assert.equal(await batch.count(), 0);
  await page.getByRole("button", { name: "Batch", exact: true }).click();
  await batch.getByLabel("Sửa nhanh Khối lượng (g) a", { exact: true }).fill("170");
  await batch.getByLabel("Sửa nhanh Dài (cm) a", { exact: true }).fill("8");
  await batch.getByLabel("Sửa nhanh Rộng (cm) a", { exact: true }).fill("6");
  await batch.getByLabel("Sửa nhanh Cao (cm) a", { exact: true }).fill("3");
  assert.equal(await batch.getByRole("complementary", { name: "Chi tiết đơn gửi VP" }).isVisible(), false);
  await batch.getByRole("button", { name: "Chỉnh đơn a", exact: true }).click();
  await batch.getByLabel("weight a", { exact: true }).fill("170");
  await batch.getByLabel("weight a", { exact: true }).press("Tab");
  await batch.getByLabel("SĐT a", { exact: true }).focus();
  await page.keyboard.press("End");
  await page.keyboard.type(" ");
  assert.equal(
    await batch
      .getByLabel("SĐT a", { exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await batch.getByRole("button", { name: "Chỉnh đơn b", exact: true }).click();
  await batch.getByRole("button", { name: "Chỉnh đơn a", exact: true }).click();
  assert.equal(
    await batch.getByLabel("weight a", { exact: true }).inputValue(),
    "170",
  );
  await batch
    .getByRole("button", { name: "Đóng chi tiết đơn", exact: true })
    .click();
  assert.equal(
    await batch.getByLabel("weight a", { exact: true }).isVisible(),
    false,
  );
  await batch
    .getByRole("button", { name: "Cần bổ sung 1", exact: true })
    .click();
  assert.equal(await batch.locator("tbody tr").count(), 1);
  await batch.getByRole("button", { name: "Tất cả 3", exact: true }).click();
  assert.equal(await batch.locator("tbody tr").count(), 3);
  await batch
    .getByRole("button", {
      name: "Gửi 2 đơn & lấy nhãn",
      exact: true,
    })
    .click();
  await page.waitForFunction(() => window.printRequests.length === 1);
  let data = await page.evaluate(() => ({
    sent: window.sent,
    synced: window.synced,
    prints: window.printRequests,
  }));
  assert.equal(data.sent.length, 2);
  assert.equal(data.sent[0].options.weight, 0.17);
  assert.equal(data.sent[0].options.length, 8);
  assert.equal(data.sent[0].options.width, 6);
  assert.equal(data.sent[0].options.height, 3);
  assert.deepEqual(data.sent[0].options.vpDeclarations, [
    {
      orderItemId: "ia",
      declarationName: "Wooden ornament",
      merchandiseCode: "442199",
    },
  ]);
  assert.ok(
    data.sent.every(
      (s) => s.account === "acc2" && s.carrier === "VIETTEL_POST",
    ),
  );
  assert.deepEqual(data.prints[0], { shipmentIds: ["s-a"], mode: "double" });
  assert.equal(
    await page.getByText(/Chưa xác nhận được kết quả gửi/).count(),
    1,
  );
  assert.equal(
    await page
      .getByRole("list")
      .getByText(/Sẵn sàng in/)
      .count(),
    1,
  );
  await page.getByLabel("Loại nhãn", { exact: true }).selectOption("single");
  await page
    .getByRole("list")
    .getByText("Sẵn sàng in", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByText(/Chưa xác nhận được kết quả gửi/).count(),
    1,
  );
  assert.equal(await page.evaluate(() => window.sent.length), 2);
  await page.getByRole("button", { name: "Single", exact: true }).click();
  await page
    .getByRole("button", { name: "Tạo vận đơn Viettel Post", exact: true })
    .click();
  await page.waitForFunction(() => window.printRequests.length === 2);
  data = await page.evaluate(() => ({
    sent: window.sent,
    prints: window.printRequests,
  }));
  assert.equal(data.sent.length, 3);
  assert.deepEqual(data.sent[2].options.vpDeclarations, [
    {
      orderItemId: "ia",
      declarationName: "Wooden ornament",
      merchandiseCode: "442199",
    },
  ]);
  assert.deepEqual(data.prints[1].shipmentIds, ["s-single"]);
  await page.getByRole("button", { name: "Single", exact: true }).click();
  await page.getByRole("dialog").dispatchEvent("mousedown");
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page.evaluate(() => {
    window.failMappings = true;
  });
  await page.getByRole("button", { name: "Batch", exact: true }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Chưa tải được mapping của 3 đơn" })
    .waitFor();
  assert.equal(await batch.getByRole("alert").count(), 1);
  assert.equal(
    await batch
      .getByRole("button", { name: "Gửi 0 đơn & lấy nhãn", exact: true })
      .isDisabled(),
    true,
  );
  await page.evaluate(() => {
    window.failMappings = false;
  });
  await batch.getByRole("button", { name: "Thử lại", exact: true }).click();
  await batch
    .getByRole("button", { name: "Gửi 2 đơn & lấy nhãn", exact: true })
    .waitFor();
  await page.waitForFunction(() => !document.querySelector('[role="alert"]'));
  assert.equal(
    await batch
      .getByRole("link", { name: "Quản lý mapping SKU", exact: true })
      .count(),
    1,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS UI: VP batch valid subset, per-order grams, ACC2, independent failure, automatic labels/PDF; single uses same flow",
  );
} finally {
  await browser.close();
}
