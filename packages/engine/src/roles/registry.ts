import * as ambusher from "./mafia/ambusher.js";
import * as blackmailer from "./mafia/blackmailer.js";
import * as bootlegger from "./mafia/bootlegger.js";
import * as consigliere from "./mafia/consigliere.js";
import * as disguiser from "./mafia/disguiser.js";
import * as forger from "./mafia/forger.js";
import * as framer from "./mafia/framer.js";
import * as godfather from "./mafia/godfather.js";
import * as hypnotist from "./mafia/hypnotist.js";
import * as janitor from "./mafia/janitor.js";
import * as mafioso from "./mafia/mafioso.js";
import * as bodyguard from "./town/bodyguard.js";
import * as crusader from "./town/crusader.js";
import * as doctor from "./town/doctor.js";
import * as investigator from "./town/investigator.js";
import * as jailor from "./town/jailor.js";
import * as lookout from "./town/lookout.js";
import * as mayor from "./town/mayor.js";
import * as medium from "./town/medium.js";
import * as psychic from "./town/psychic.js";
import * as retributionist from "./town/retributionist.js";
import * as sheriff from "./town/sheriff.js";
import * as spy from "./town/spy.js";
import * as tavern_keeper from "./town/tavern_keeper.js";
import * as tracker from "./town/tracker.js";
import * as transporter from "./town/transporter.js";
import * as trapper from "./town/trapper.js";
import * as veteran from "./town/veteran.js";
import * as vigilante from "./town/vigilante.js";

import type { RoleHandler } from "./types.js";

/** Todos los roles del MVP (Mafia y Town), indexados por clave. */
export const ROLE_HANDLERS: ReadonlyMap<string, RoleHandler> = new Map(
  [
  ambusher.handler,
  blackmailer.handler,
  bootlegger.handler,
  consigliere.handler,
  disguiser.handler,
  forger.handler,
  framer.handler,
  godfather.handler,
  hypnotist.handler,
  janitor.handler,
  mafioso.handler,
  bodyguard.handler,
  crusader.handler,
  doctor.handler,
  investigator.handler,
  jailor.handler,
  lookout.handler,
  mayor.handler,
  medium.handler,
  psychic.handler,
  retributionist.handler,
  sheriff.handler,
  spy.handler,
  tavern_keeper.handler,
  tracker.handler,
  transporter.handler,
  trapper.handler,
  veteran.handler,
  vigilante.handler,
  ].map((h) => [h.key, h]),
);
