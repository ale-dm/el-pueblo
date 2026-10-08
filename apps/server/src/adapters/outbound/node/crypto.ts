import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import type { IdGenerator, Security } from "../../../application/ports.js";

/** Sin 0, O, 1 ni I: los códigos se leen en voz alta y se escriben a mano. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class CryptoIds implements IdGenerator {
  constructor(private readonly codeLength = 6) {}

  uuid() {
    return randomUUID();
  }

  roomCode() {
    let code = "";
    for (let i = 0; i < this.codeLength; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    return code;
  }
}

export class CryptoSecurity implements Security {
  newToken() {
    return randomBytes(24).toString("base64url");
  }

  hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  newSeed() {
    return randomInt(1, 2 ** 31 - 1);
  }
}
