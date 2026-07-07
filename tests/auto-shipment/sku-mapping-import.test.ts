import assert from "node:assert/strict";
import { ApiError } from "@/lib/api/base";
import {
  buildSkuMappingImportTemplateCsv,
  findExactSkuMappingImportMapping,
  formatSkuMappingImportApiError,
  isSkuMappingImportConflictError,
  parseSkuMappingImportCsv,
  resolveSkuMappingImportAction,
  resolveSkuMappingImportActions,
} from "@/lib/shipment-automation-import";

const template = buildSkuMappingImportTemplateCsv();

assert.ok(template.startsWith("SKU Code,Country Code,Shipping Method Code"));
assert.ok(template.includes("VN-YTYCPREC"));

const parsed =
  parseSkuMappingImportCsv(`SKU Code,Country Code,Shipping Method Code,EName,CName,Description
nk,us,VN-YTYCPREC,Embroidered shirt,Embroidered shirt CN,US shirt route
"wd","CA","VNTHZXR","Wooden decor","Wooden decor CN","Canada, decor route"
`);

assert.equal(parsed.errors.length, 0);
assert.equal(parsed.rows.length, 2);
assert.deepEqual(parsed.rows[0], {
  skuCode: "NK",
  destinationCountryCode: "US",
  shippingMethodCode: "VN-YTYCPREC",
  eName: "Embroidered shirt",
  cName: "Embroidered shirt CN",
  description: "US shirt route",
});
assert.deepEqual(parsed.rows[1], {
  skuCode: "WD",
  destinationCountryCode: "CA",
  shippingMethodCode: "VNTHZXR",
  eName: "Wooden decor",
  cName: "Wooden decor CN",
  description: "Canada, decor route",
});

const invalid =
  parseSkuMappingImportCsv(`SKU Code,Country Code,Shipping Method Code,EName,CName
,US,VN-YTYCPREC,Embroidered shirt,Embroidered shirt CN
NK,US,INVALID,Embroidered shirt,Embroidered shirt CN
`);

assert.equal(invalid.rows.length, 0);
assert.equal(invalid.errors.length, 2);
assert.equal(invalid.errors[0]?.rowNumber, 2);
assert.match(invalid.errors[0]?.message ?? "", /SKU Code/);
assert.equal(invalid.errors[1]?.rowNumber, 3);
assert.match(invalid.errors[1]?.message ?? "", /Shipping Method Code/);

const duplicateError = new ApiError(
  409,
  "CONFLICT",
  "SKU and destination country shipping method mapping already exists.",
);

assert.equal(
  formatSkuMappingImportApiError(duplicateError),
  "SKU and destination country shipping method mapping already exists.",
);

const detailedCarrierError = new ApiError(
  502,
  "CARRIER_ERROR",
  "YunExpress OMS request was rejected.",
  {
    safeMetadata: {
      message: "Submission failed!",
      itemRemarks: ["Destination country is not reachable by this method."],
    },
  },
);

assert.equal(
  formatSkuMappingImportApiError(detailedCarrierError),
  "Destination country is not reachable by this method.",
);

const importActions = resolveSkuMappingImportActions({
  rows: [
    {
      skuCode: "NK",
      destinationCountryCode: "US",
      shippingMethodCode: "VN-YTYCPREC",
      eName: "Updated shirt",
      cName: "Updated CN",
      description: "Overwrite existing exact route",
    },
    {
      skuCode: "NK",
      destinationCountryCode: "CA",
      shippingMethodCode: "VNTHZXR",
      eName: "Canada shirt",
      cName: "Canada CN",
      description: null,
    },
    {
      skuCode: "WD",
      destinationCountryCode: "GB",
      shippingMethodCode: "VN-YTYCPREC",
      eName: "Wrong decor method",
      cName: "Wrong decor CN",
      description: null,
    },
  ],
  existingMappings: [
    {
      id: "map_us",
      skuCode: "NK",
      destinationCountryCode: "US",
      shippingMethodCode: "VN-YTYCPREC",
    },
    {
      id: "map_gb",
      skuCode: "WD",
      destinationCountryCode: "GB",
      shippingMethodCode: "VNFZZXR",
    },
  ],
});

assert.equal(importActions[0]?.type, "overwrite");
assert.equal(importActions[0]?.mapping.id, "map_us");
assert.equal(importActions[1]?.type, "create");
assert.equal(importActions[2]?.type, "conflict");
assert.match(importActions[2]?.message ?? "", /VNFZZXR/);
assert.match(importActions[2]?.message ?? "", /VN-YTYCPREC/);

const firstPassAction = resolveSkuMappingImportAction(
  {
    skuCode: "NP",
    destinationCountryCode: "US",
    shippingMethodCode: "VN-YTYCPREC",
    eName: "Napkins",
    cName: "餐巾",
    description: null,
  },
  [],
);

assert.equal(firstPassAction.type, "create");

const secondPassAction = resolveSkuMappingImportAction(
  {
    skuCode: "NP",
    destinationCountryCode: "US",
    shippingMethodCode: "VN-YTYCPREC",
    eName: "Updated napkins",
    cName: "更新餐巾",
    description: "same route in current import should overwrite",
  },
  [
    {
      id: "map_created_during_import",
      skuCode: "NP",
      destinationCountryCode: "US",
      shippingMethodCode: "VN-YTYCPREC",
    },
  ],
);

assert.equal(secondPassAction.type, "overwrite");
assert.equal(secondPassAction.mapping.id, "map_created_during_import");

const staleCreateConflict = new ApiError(
  409,
  "CONFLICT",
  "SKU and destination country shipping method mapping already exists.",
);
const staleImportRow = {
  skuCode: "NK",
  destinationCountryCode: "US",
  shippingMethodCode: "VN-YTYCPREC",
  eName: "Description-only update",
  cName: "Description CN",
  description: "new description",
};
const refreshedExactMapping = findExactSkuMappingImportMapping(staleImportRow, [
  {
    id: "map_refreshed",
    skuCode: "NK",
    destinationCountryCode: "US",
    shippingMethodCode: "VN-YTYCPREC",
  },
]);

assert.equal(isSkuMappingImportConflictError(staleCreateConflict), true);
assert.equal(refreshedExactMapping?.id, "map_refreshed");

console.log("SKU mapping import tests passed");
