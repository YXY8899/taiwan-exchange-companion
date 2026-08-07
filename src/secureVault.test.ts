import { describe, expect, it } from "vitest";
import { decryptPrivateData, encryptPrivateData, type PrivateVaultData } from "./secureVault";

describe("private vault", () => {
  it("encrypts, decrypts, and rejects an incorrect PIN", async () => {
    const data: PrivateVaultData = { profile: { name: "Test", studentId: "1", passportId: "P" }, medicalInfo: { allergies: "", medications: "", bloodType: "", emergencyContact: "" }, emergencyDetails: { accommodation: "", university: "", embassy: "", insurance: "", localEmergency: "112" } };
    const vault = await encryptPrivateData(data, "123456");
    await expect(decryptPrivateData(vault, "123456")).resolves.toEqual(data);
    await expect(decryptPrivateData(vault, "000000")).rejects.toThrow("Incorrect PIN");
  });
});
