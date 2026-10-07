import { registerCarrierAdapter } from "@/modules/carrier/registry";
import { createViettelPostAdapter } from "./adapter";

registerCarrierAdapter(createViettelPostAdapter());
