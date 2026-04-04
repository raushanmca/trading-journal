const crypto = require("crypto");

const ENCRYPTION_SECRET =
  process.env.JOURNAL_ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  "dev-journal-encryption-key-change-me";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey() {
  return crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();
}

function encryptJournalPayload(payload) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    iv,
  );

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

function decryptJournalPayload(value = "") {
  if (!value) {
    return null;
  }

  const [ivText, authTagText, encryptedText] = value.split(".");

  if (!ivText || !authTagText || !encryptedText) {
    return null;
  }

  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivText, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTagText, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(decrypted);
}

module.exports = {
  decryptJournalPayload,
  encryptJournalPayload,
};
