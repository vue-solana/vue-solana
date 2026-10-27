import { getBase64Encoder } from "@vue-solana/core/kit";

// The name reads backwards on purpose: a codec's *encoder* turns the string
// value into bytes, so the base64 string in, bytes out.
export function decodeBase64(value: string): Uint8Array {
  // Kit types its output as readonly; it is a real `Uint8Array` at runtime and
  // account data is published as mutable bytes by `AccountInfo`.
  return getBase64Encoder().encode(value) as Uint8Array;
}
