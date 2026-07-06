import assert from "node:assert/strict";
import {
  DEFAULT_YUN_IOSS_NUMBER,
  assertYunIossReadyForDestination,
  isYunIossRequiredForDestination,
  resolveYunIossForShipment,
  validateTenantYunIossSettingInput,
} from "@/modules/yun-ioss";
import { AppError } from "@/shared/errors";

assert.equal(DEFAULT_YUN_IOSS_NUMBER, "IOSS261841515582105977183");
assert.equal(
  isYunIossRequiredForDestination({
    destinationCountryCode: "DE",
    sourceChannel: "ETSY",
  }),
  true,
);
assert.equal(
  isYunIossRequiredForDestination({
    destinationCountryCode: "Germany",
    sourceChannel: "AMAZON",
  }),
  false,
);
assert.equal(
  isYunIossRequiredForDestination({
    destinationCountryCode: "US",
    sourceChannel: "ETSY",
  }),
  false,
);

assert.deepEqual(
  validateTenantYunIossSettingInput({
    iossNumber: " im1234567890 ",
    status: "ACTIVE",
  }),
  {
    iossNumber: "IM1234567890",
    status: "ACTIVE",
  },
);

assert.deepEqual(
  validateTenantYunIossSettingInput({
    iossNumber: "",
    status: "DISABLED",
  }),
  {
    iossNumber: null,
    status: "DISABLED",
  },
);

assert.doesNotThrow(() =>
  assertYunIossReadyForDestination({
    destinationCountryCode: "US",
    sourceChannel: "ETSY",
    setting: null,
  }),
);

assert.doesNotThrow(() =>
  assertYunIossReadyForDestination({
    destinationCountryCode: "FR",
    sourceChannel: "AMAZON",
    setting: null,
  }),
);

assert.equal(
  resolveYunIossForShipment({
    destinationCountryCode: "FR",
    sourceChannel: "ETSY",
    setting: null,
  }),
  DEFAULT_YUN_IOSS_NUMBER,
);

assert.throws(
  () =>
    assertYunIossReadyForDestination({
      destinationCountryCode: "FR",
      sourceChannel: "ETSY",
      setting: { iossNumber: null, status: "DISABLED" },
    }),
  (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, "CONFLICT");
    const details = error.details as Record<string, unknown>;
    assert.equal(details.reason, "MISSING_IOSS");
    assert.equal(details.destinationCountryCode, "FR");
    return true;
  },
);

assert.doesNotThrow(() =>
  assertYunIossReadyForDestination({
    destinationCountryCode: "France",
    sourceChannel: "ETSY",
    setting: { iossNumber: "IM1234567890", status: "ACTIVE" },
  }),
);

console.log("yun ioss service tests passed");
