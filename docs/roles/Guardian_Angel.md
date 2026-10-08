# Guardian Angel

- **Facción:** Neutral  · *fase posterior (referencia)*
- **Página de la wiki:** Guardian Angel

![icono](../../data/roles/img/Guardian_Angel_icon.png)
![skin](../../data/roles/img/Guardian_Angel_skin.png)

## Ficha

**Clase (alineamiento):**

> Neutral Benign

**Tipo:**

> Protection
> Non-Unique

**Prioridad de acción:**

> 2

**Resumen:**

> You are an Angel whose only goal is the protection of your charge.

**Objetivo:**

> Keep your target alive until the end of the game.

**Habilidades:**

> Keep your target alive.

**Atributos:**

> Detection Immunity
> Attack: None
> Defense: None

**Atributos (texto):**

> Your target is XXXXXXX.
> If your target is killed you will become a Survivor without any bulletproof vests.
> Twice a game you may Heal and Purge your target. This may be done from the grave. Watching over a player ignores Jail.

**Especial:**

> Turns into a Survivor with no vests when target is killed

**Si hay Godfather/otro objetivo:**

> Protect target

**Gana con:**

> Town
> Mafia
> Coven
> Survivor
> Arsonist
> Serial Killer
> Vampire
> Werewolf
> Plaguebearer
> Pestilence
> Juggernaut

**Debe matar para ganar:**

> N/A (target must live)

**Restricciones:**

> 2 uses

**Resultado Investigator:**

> Coven Expansion Results
> Your target could be a .

**Resultado Consigliere:**

> Your target is watching over someone. They must be a Guardian Angel.

## Texto completo de la wiki

(sin texto en el alcance)

## Implementación

- [ ] Definido en `packages/engine` con su prioridad y facción
- [ ] Acción nocturna (si aplica) validada con objetivos legales
- [ ] Resultado de investigación correcto (Sheriff / Investigator / Consigliere)
- [ ] Condición de victoria y de derrota comprobada en tests
- [ ] Tests unitarios del rol en verde
- [ ] Tarjeta y texto de ayuda en la app
- [ ] Icono e ilustración propia (no el arte de la wiki)
- [ ] Plantillas de narración para sus eventos
