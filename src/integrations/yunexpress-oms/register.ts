import { registerCarrierAdapter } from "@/modules/carrier/registry";
import { createYunExpressOmsAdapter } from "./adapter";

registerCarrierAdapter(createYunExpressOmsAdapter());
