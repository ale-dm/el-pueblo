# Revisión de roles del MVP (fase 1)

Contrastado con las fichas de `docs/roles/` (wiki de Town of Salem 1). Estados:
- **OK**: la habilidad y sus usos coinciden con la ficha.
- **Parcial**: funciona, pero con una simplificación documentada.
- **Pendiente**: la habilidad no se ofrece en la interfaz hasta implementarla.
- **Sin verificar**: la ficha no lo dice con claridad.

## Town (19)

| Rol | Estado | Nota |
|---|---|---|
| Bodyguard | OK | Protege con 2 de poder. Si puede protegerse a sí mismo: sin verificar |
| Crusader | OK | Ilimitado, no puede protegerse a sí mismo; ataca a los visitantes |
| Doctor | OK | Curar a otros ilimitado. Autocuración una vez por partida (habilidad `selfHeal`). No cura a un Mayor revelado |
| Investigator | Parcial | Muestra el bando del objetivo, no dos roles posibles |
| Jailor | Parcial | Encarcela de día (también el día 1) y ejecuta de noche, 3 veces, nunca en la noche 1. Falta: al ejecutar a un Town pierde las ejecuciones restantes |
| Lookout | OK | Ve las visitas al objetivo |
| Mayor | OK | Revelarse una vez; el voto cuenta como 3. No puede ser curado tras revelarse |
| Medium | Pendiente | Comunicación con los muertos no implementada. Oculta su habilidad |
| Psychic | OK | Recibe una visión cada noche |
| Retributionist | Pendiente | Revivir muertos no implementado. Oculta su habilidad |
| Sheriff | OK | Sospechoso / inocente. Excepciones de inmunidad a la detección sin verificar |
| Spy | Parcial | Ve las visitas de la Mafia, sin ver la casa concreta |
| Tavern Keeper | OK | Inmune a bloqueos |
| Tracker | OK | Ve a quién visita el objetivo |
| Transporter | OK | Intercambia dos jugadores; no hay protecciones de Guardian Angel en el MVP |
| Trapper | OK | Trampa que activa la noche siguiente |
| Vampire Hunter | Pendiente | Sin Vampiros en el MVP. Oculta su habilidad |
| Veteran | OK | Alerta 3 veces; inmune a bloqueos |
| Vigilante | OK | Disparar 3 veces; si mata a un Town, se suicida (regla de culpa) |

## Mafia (11)

| Rol | Estado | Nota |
|---|---|---|
| Ambusher | OK | Ataca a los visitantes de su objetivo |
| Blackmailer | OK | Silencia al objetivo de día |
| Bootlegger | OK | Bloquea una acción |
| Consigliere | OK | Revela el rol del objetivo |
| Disguiser | Pendiente | Disfraz no implementado. Oculta su habilidad |
| Forger | Pendiente | Falsificar voluntades no implementado (no hay voluntades en el MVP). Usos: 2, según la ficha. Oculta su habilidad |
| Framer | OK | Marca al objetivo como enmarcado |
| Godfather | OK | Ordena la muerte; inmune a la detección |
| Hypnotist | Pendiente | Recuerdos falsos no implementados. Oculta su habilidad |
| Janitor | Parcial | Limpia el rol. Usos: 3 en el código; la ficha no confirma el límite (sin verificar) |
| Mafioso | OK | Ejecuta la orden del Godfather. Pasar a Godfather si este muere: sin verificar |

## Cambios de esta revisión

- Doctor: autocuración limitada a una vez (habilidad `selfHeal`).
- Doctor: no cura a un Mayor que ya se ha revelado.
- Medium, Retributionist, Vampire Hunter, Disguiser, Forger, Hypnotist: no se ofrece su habilidad, porque no tenía efecto y engañaba al jugador.
- Jailor: no ejecuta en la noche 1.
