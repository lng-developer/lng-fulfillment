/* eslint-disable @typescript-eslint/no-require-imports -- mock DB boundary */
require("tsx/cjs");
const assert = require("node:assert/strict");
const Module = require("node:module");
const original = Module._load;
let lookups = 0;
const saved = {
  mappingType: "SKU",
  skuCode: "SKU",
  destinationCountryCode: "US",
  declarationName: "Wooden ornament",
  merchandiseCode: "442199",
};
let stored = [saved];
Module._load = function (name, parent, ...rest) {
  if (
    name === "./repository" &&
    parent?.filename
      .replaceAll("\\", "/")
      .endsWith("/vp-merchandise/service.ts")
  )
    return {
      listMappingPage: async (...args) => args,
      createMapping: async (tenant, actor, mapping) => {
        assert.equal(tenant, "tenant-a");
        assert.equal(actor, "user-a");
        if (mapping.skuCode === "DUP") throw { code: "P2002" };
        return mapping;
      },
      deleteMapping: async (tenant, sku, country) => {
        assert.equal(tenant, "tenant-a");
        assert.equal(country, "US");
        return { count: sku === "SKU" ? 1 : 0 };
      },
      findMappings: async (tenant, country, skus, groups) => {
        lookups++;
        assert.equal(tenant, "tenant-a");
        return stored.filter(
          (m) =>
            m.destinationCountryCode === country &&
            (m.mappingType === "GROUP" ? groups : skus).includes(m.skuCode),
        );
      },
      saveMapping: async (tenant, actor, value) => {
        assert.equal(tenant, "tenant-a");
        assert.equal(actor, "user-a");
        return value;
      },
    };
  return original.call(this, name, parent, ...rest);
};
const service = require("../../src/modules/vp-merchandise/service");
Module._load = original;
const item = {
  shipmentItemId: "s1",
  orderItemId: "i1",
  sku: "SKU",
  name: "Untrusted listing",
  quantity: 2,
};
const input = {
  tenantId: "tenant-a",
  carrierCode: "VIETTEL_POST",
  recipient: { country: "US" },
  items: [item],
};
(async () => {
  assert.deepEqual(await service.listMappings("tenant-a", " SKU ", "US", 2), [
    "tenant-a",
    "SKU",
    "US",
    2,
  ]);
  assert.throws(() => service.listMappings("tenant-a", "", "US", 0));
  assert.throws(() => service.listMappings("tenant-a", "", "invalid", 1));
  assert.deepEqual(
    await service.addMapping("tenant-a", "user-a", saved),
    saved,
  );
  await assert.rejects(
    () =>
      service.addMapping("tenant-a", "user-a", { ...saved, skuCode: "DUP" }),
    (e) => e.status === 409,
  );
  await service.removeMapping("tenant-a", saved);
  await assert.rejects(
    () => service.removeMapping("tenant-a", { ...saved, skuCode: "OTHER" }),
    (e) => e.status === 404,
  );
  const mapped = await service.applyVpDeclarations(input);
  assert.equal(mapped.items[0].name, "Wooden ornament");
  assert.equal(mapped.items[0].quantity, 2);
  assert.equal(mapped.metadata.hsCode, "442199");
  await assert.rejects(
    () =>
      service.applyVpDeclarations({
        ...input,
        items: [{ ...item, sku: "UNKNOWN" }],
      }),
    /Nhập tên/,
  );
  const overrides = [
    {
      orderItemId: "i1",
      declarationName: "Personalized wooden ornament",
      merchandiseCode: "442199",
    },
  ];
  const before = lookups;
  const edited = await service.applyVpDeclarations(
    { ...input, items: [{ ...item, sku: null }] },
    overrides,
  );
  assert.equal(edited.items[0].name, overrides[0].declarationName);
  assert.equal(lookups, before);
  await assert.rejects(
    () =>
      service.applyVpDeclarations(input, [
        { ...overrides[0], orderItemId: "other" },
      ]),
    /không thuộc/,
  );
  await assert.rejects(
    () => service.applyVpDeclarations(input, [overrides[0], overrides[0]]),
    /trùng/,
  );
  await assert.rejects(
    () =>
      service.applyVpDeclarations(
        { ...input, items: [item, { ...item, orderItemId: "i2" }] },
        [
          overrides[0],
          { ...overrides[0], orderItemId: "i2", merchandiseCode: "610910" },
        ],
      ),
    /nhiều nhóm/,
  );
  const yun = { ...input, carrierCode: "YUNEXPRESS_OMS" };
  assert.equal(await service.applyVpDeclarations(yun), yun);
  assert.deepEqual(
    await service.upsertMapping("tenant-a", "user-a", saved),
    saved,
  );
  await assert.rejects(
    () =>
      service.upsertMapping("tenant-a", "user-a", {
        ...saved,
        merchandiseCode: "",
      }),
    /mã merchandise/,
  );
  await assert.rejects(
    () => service.lookupMappings("tenant-a", "US", Array(51).fill("SKU")),
    /không hợp lệ/,
  );

  const group = {
    ...saved,
    mappingType: "GROUP",
    skuCode: "ACO",
    declarationName: "Acrylic Christmas ornament",
  };
  stored = [
    group,
    {
      ...saved,
      skuCode: "J2605-ACO-special",
      declarationName: "Exact override",
    },
  ];
  const resolved = await service.lookupMappings("tenant-a", "US", [
    "J2605-ACO-one",
    "J2605-ACO-special",
    "J2605-XACO-one",
    "ACO",
    "J2605--ACO",
  ]);
  assert.equal(resolved.length, 2);
  assert.equal(resolved[0].matchedKey, "ACO");
  assert.equal(resolved[0].mappingType, "GROUP");
  assert.equal(resolved[1].declarationName, "Exact override");
  assert.deepEqual(
    await service.lookupMappings("tenant-a", "AU", ["J2605-ACO-one"]),
    [],
  );
  const grouped = await service.applyVpDeclarations({
    ...input,
    items: [{ ...item, sku: "J2605-ACO-one" }],
  });
  assert.equal(grouped.items[0].name, "Acrylic Christmas ornament");
  assert.equal(grouped.items[0].quantity, 2);
  assert.equal(
    service.validateMapping({ ...group, skuCode: "aco" }).skuCode,
    "ACO",
  );
  assert.throws(
    () => service.validateMapping({ ...group, skuCode: "J2605-ACO-one" }),
    /mã nhóm/,
  );
  assert.throws(
    () => service.validateMapping({ ...group, mappingType: "CONTAINS" }),
    /Loại mapping/,
  );
  assert.equal(
    service.validateMapping({ ...saved, mappingType: undefined }).mappingType,
    "SKU",
  );
  console.log(
    "PASS VP service: exact tenant/SKU, no default, per-item override, repeated/mixed items, unchanged Yun",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
