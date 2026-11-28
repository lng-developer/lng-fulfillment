import assert from "node:assert/strict";
import { vpDeclarationIssue } from "@/shared/vp-declarations";
import { validateShipOrderInput } from "@/modules/shipment/validation";
const item = {
  orderItemId: "item1",
  declarationName: "Wooden ornament",
  merchandiseCode: "442199",
};
assert.equal(vpDeclarationIssue([item]), null);
assert.ok(vpDeclarationIssue([{ ...item, declarationName: "" }]));
assert.ok(vpDeclarationIssue([{ ...item, merchandiseCode: "" }]));
assert.ok(
  vpDeclarationIssue([
    item,
    { ...item, orderItemId: "item2", merchandiseCode: "610910" },
  ]),
);
assert.equal(
  vpDeclarationIssue([
    item,
    { ...item, orderItemId: "item2", declarationName: "Wooden sign" },
  ]),
  null,
);
const parsed = validateShipOrderInput("order", {options:{vpDeclarations:[item]}});
assert.deepEqual(parsed.options?.vpDeclarations,[item]);
for (const invalid of [null, {}, [], [{...item,declarationName:123}], [item,item], Array(51).fill(item)]) {
  assert.throws(()=>validateShipOrderInput("order",{options:{vpDeclarations:invalid}}));
}
console.log(
  "PASS VP declarations: missing, mixed, duplicate validation; no guessed categories",
);
