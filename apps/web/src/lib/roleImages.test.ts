import { describe, expect, it } from "vitest";
import { ROLE_IMAGE_FILES, roleIconUrl, roleSkinUrl } from "./roleImages.js";
import { ROLE_NAMES } from "./roles.js";

/** Archivos realmente servidos desde public/roles/img (se listan en tiempo de prueba). */
const served = new Set(Object.keys(import.meta.glob("../../public/roles/img/*.png")).map((p) => p.split("/").pop()!));

/** Roles del MVP: todos los de ROLE_NAMES salvo Vampire Hunter, que sale del MVP (docs/ROLES_STATUS.md, nota). */
const MVP = Object.keys(ROLE_NAMES).filter((k) => k !== "vampire_hunter");

describe("imágenes de los roles del MVP (arte de la wiki con permiso)", () => {
  it("cada rol del MVP tiene su icono resuelto a un archivo que existe", () => {
    for (const key of MVP) {
      const url = roleIconUrl(key);
      expect(url, key).not.toBeNull();
      expect(served.has(url!.split("/").pop()!), `${key}: ${url}`).toBe(true);
    }
  });

  it("cada rol con skin en la wiki tiene la ilustración resuelta a un archivo que existe", () => {
    for (const key of MVP) {
      const url = roleSkinUrl(key);
      if (url === null) continue;
      expect(served.has(url.split("/").pop()!), `${key}: ${url}`).toBe(true);
    }
  });

  it("el mapa cubre exactamente los roles del MVP", () => {
    expect(Object.keys(ROLE_IMAGE_FILES).sort()).toEqual([...MVP].sort());
  });

  it("Ambusher, Blackmailer y Framer no tienen skin en la wiki: solo icono (SKIPPED)", () => {
    for (const key of ["ambusher", "blackmailer", "framer"]) {
      expect(roleSkinUrl(key), key).toBeNull();
      expect(roleIconUrl(key), key).not.toBeNull();
    }
  });

  it("sin rol, o fuera del MVP, no hay imagen", () => {
    expect(roleIconUrl(null)).toBeNull();
    expect(roleIconUrl("vampire_hunter")).toBeNull();
    expect(roleSkinUrl("desconocido")).toBeNull();
  });
});
