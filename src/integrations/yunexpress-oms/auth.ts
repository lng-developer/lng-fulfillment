export function createYunExpressOmsAuthorizationHeader(input: {
  customerNo: string;
  apiSecret: string;
}): string {
  const raw = `${input.customerNo}&${input.apiSecret}`;
  return `Basic ${Buffer.from(raw, "utf8").toString("base64")}`;
}
