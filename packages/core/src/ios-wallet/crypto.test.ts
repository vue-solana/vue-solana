import bs58 from "bs58";
import * as tweetnacl from "tweetnacl";
import { describe, expect, it } from "vitest";
import { createRequestId, decryptPayload, encryptPayload, getSharedSecret, nacl } from "./crypto";

describe("iOS wallet crypto", () => {
  it("createRequestId returns a base58-encoded 16-byte id", () => {
    const requestId = createRequestId();

    expect(typeof requestId).toBe("string");
    expect(bs58.decode(requestId)).toHaveLength(16);
  });

  it("getSharedSecret rejects missing wallet encryption public keys", () => {
    const dappKeyPair = nacl.box.keyPair();

    expect(() => getSharedSecret(undefined, bs58.encode(dappKeyPair.secretKey))).toThrow(
      "Missing iOS wallet encryption public key",
    );
  });

  it("getSharedSecret derives the same shared secret as tweetnacl", () => {
    const dappKeyPair = nacl.box.keyPair();
    const walletKeyPair = nacl.box.keyPair();

    const sharedSecret = getSharedSecret(
      bs58.encode(walletKeyPair.publicKey),
      bs58.encode(dappKeyPair.secretKey),
    );

    expect(sharedSecret).toEqual(
      tweetnacl.box.before(walletKeyPair.publicKey, dappKeyPair.secretKey),
    );
  });

  it("encryptPayload and decryptPayload round-trip JSON payloads", () => {
    const sharedSecret = nacl.randomBytes(nacl.box.sharedKeyLength);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const payload = {
      public_key: "11111111111111111111111111111111",
      session: "session-token",
      nested: { count: 1, active: true },
    };

    const data = encryptPayload(payload, nonce, sharedSecret);

    expect(decryptPayload(data, bs58.encode(nonce), sharedSecret)).toEqual(payload);
  });

  it("decryptPayload rejects callbacks encrypted for a different shared secret", () => {
    const sharedSecret = nacl.randomBytes(nacl.box.sharedKeyLength);
    const wrongSharedSecret = nacl.randomBytes(nacl.box.sharedKeyLength);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const data = encryptPayload({ session: "session-token" }, nonce, sharedSecret);

    expect(() => decryptPayload(data, bs58.encode(nonce), wrongSharedSecret)).toThrow(
      "Unable to decrypt iOS wallet callback",
    );
  });

  it("decryptPayload rejects corrupted callback data", () => {
    const sharedSecret = nacl.randomBytes(nacl.box.sharedKeyLength);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const encrypted = bs58.decode(
      encryptPayload({ session: "session-token" }, nonce, sharedSecret),
    );

    encrypted[0] = encrypted[0]! ^ 1;

    expect(() => decryptPayload(bs58.encode(encrypted), bs58.encode(nonce), sharedSecret)).toThrow(
      "Unable to decrypt iOS wallet callback",
    );
  });
});
