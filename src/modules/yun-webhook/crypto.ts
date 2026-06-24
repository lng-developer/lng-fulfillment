import crypto from "node:crypto";

export function verifyYunWebhookSignature(input: {
  timestamp: string;
  encryptKey: string;
  rawBody: string;
  receivedSignature: string;
}) {
  const expectedSignature = crypto
    .createHash("sha256")
    .update(`${input.timestamp}${input.encryptKey}${input.rawBody}`, "utf8")
    .digest("hex");

  return safeEqualHex(expectedSignature, input.receivedSignature);
}

export function decryptYunWebhookPayload(encryptText: string, encryptKey: string) {
  const encryptedBuffer = Buffer.from(encryptText, "base64");
  if (encryptedBuffer.length <= 16) {
    throw new Error("Encrypted payload is too short.");
  }

  const iv = encryptedBuffer.subarray(0, 16);
  const ciphertext = encryptedBuffer.subarray(16);
  const aesKey = crypto.createHash("sha256").update(encryptKey, "utf8").digest();
  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
  decipher.setAutoPadding(false);

  const decryptedBuffer = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return removePkcs7Padding(decryptedBuffer).toString("utf8");
}

function safeEqualHex(left: string, right: string) {
  let leftBuffer: Buffer;
  let rightBuffer: Buffer;

  try {
    leftBuffer = Buffer.from(left.toLowerCase(), "hex");
    rightBuffer = Buffer.from(right.toLowerCase(), "hex");
  } catch {
    return false;
  }

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function removePkcs7Padding(buffer: Buffer) {
  if (!buffer.length) {
    return buffer;
  }

  const paddingLength = buffer[buffer.length - 1];
  if (paddingLength < 1 || paddingLength > 16) {
    return buffer;
  }

  return buffer.subarray(0, buffer.length - paddingLength);
}
