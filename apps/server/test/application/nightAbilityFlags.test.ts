import { describe, expect, it } from "vitest";
import { ROLE_HANDLERS } from "@el-pueblo/engine";
import { nightAbilityFlags } from "../../src/application/use-cases/getView.js";

// Flags que la app usa para pintar la acción nocturna: nota de muerte (Death_Note_ToS.md:15, 17; Godfather.md:235;
// Mafioso.md:237), elección por defecto (Forger.md:242) y testamento falsificado (Forger.md:34, 204).
const ability = (role: string, key: string) => ROLE_HANDLERS.get(role)!.nightAbilities.find((a) => a.key === key)!;

describe("flags de la acción nocturna en la vista", () => {
  it("el Godfather y el Mafioso matan con nota de muerte (Godfather.md:235, Mafioso.md:237)", () => {
    expect(nightAbilityFlags(ability("godfather", "kill"))).toEqual({ deathNote: true, defaultChoice: null, writesWill: false });
    expect(nightAbilityFlags(ability("mafioso", "kill"))).toEqual({ deathNote: true, defaultChoice: null, writesWill: false });
  });

  it("el Forger escribe testamento y, sin rol elegido, guarda como Ambusher (Forger.md:204, 242)", () => {
    expect(nightAbilityFlags(ability("forger", "forge"))).toEqual({ deathNote: false, defaultChoice: "ambusher", writesWill: true });
  });

  it("una habilidad normal no lleva ninguno de los tres", () => {
    expect(nightAbilityFlags(ability("sheriff", "interrogate"))).toEqual({ deathNote: false, defaultChoice: null, writesWill: false });
  });
});
