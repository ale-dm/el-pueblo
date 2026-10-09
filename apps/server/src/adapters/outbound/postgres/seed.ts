// Carga el catálogo de juego y el volcado de la wiki desde data/ a la base de datos.
// Idempotente: cada fuente guarda su SHA-256 en catalog_meta y solo se vuelve a cargar si cambia.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { eq } from "drizzle-orm";
import * as s from "./schema.js";

export interface SeedPaths {
  /** data/catalog: factions.json, roles.json, ... */
  catalogDir: string;
  /** data/wiki: articles_all.ndjson.gz y text/index.json */
  wikiDir: string;
}

export interface SeedResult {
  seeded: string[];
  skipped: string[];
}

const CATALOG_FILES = [
  "factions", "alignments", "roles", "phase_timings", "game_modes",
  "host_rules", "voting_thresholds", "modifiers", "wiki_images",
] as const;

const sha256 = (...parts: Buffer[]) => {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest("hex");
};

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8")) as T;

export async function seedCatalog(db: any, paths: SeedPaths): Promise<SeedResult> {
  const catalogBuffers = CATALOG_FILES.map((f) => readFileSync(join(paths.catalogDir, `${f}.json`)));
  const catalogHash = sha256(...catalogBuffers);
  const wikiGz = readFileSync(join(paths.wikiDir, "articles_all.ndjson.gz"));
  const textIndexBuf = readFileSync(join(paths.wikiDir, "text", "index.json"));
  const wikiHash = sha256(wikiGz, textIndexBuf);

  const result: SeedResult = { seeded: [], skipped: [] };

  await db.transaction(async (tx: any) => {
    const currentHash = async (source: string) =>
      (await tx.select().from(s.catalogMeta).where(eq(s.catalogMeta.source, source)))[0]?.sha256;
    const markSeeded = (source: string, hash: string) =>
      tx
        .insert(s.catalogMeta)
        .values({ source, sha256: hash })
        .onConflictDoUpdate({ target: s.catalogMeta.source, set: { sha256: hash, seededAt: new Date() } });

    if ((await currentHash("catalog")) === catalogHash) {
      result.skipped.push("catalog");
    } else {
      await seedCatalogTables(tx, paths.catalogDir);
      await markSeeded("catalog", catalogHash);
      result.seeded.push("catalog");
    }

    if ((await currentHash("wiki")) === wikiHash) {
      result.skipped.push("wiki");
    } else {
      await seedWikiPages(tx, wikiGz, JSON.parse(textIndexBuf.toString("utf8")));
      await markSeeded("wiki", wikiHash);
      result.seeded.push("wiki");
    }
  });

  return result;
}

async function upsertRows(tx: any, table: any, target: any, rows: Record<string, unknown>[]) {
  for (const row of rows) {
    await tx.insert(table).values(row).onConflictDoUpdate({ target, set: row });
  }
}

async function seedCatalogTables(tx: any, dir: string) {
  const load = <T>(name: string) => readJson<T[]>(join(dir, `${name}.json`));

  await upsertRows(tx, s.factions, s.factions.key, load<any>("factions").map((f) => ({
    key: f.key, name: f.name, winCondition: f.win_condition, wikiTitle: f.wiki_title,
  })));

  await upsertRows(tx, s.alignments, s.alignments.key, load<any>("alignments").map((a) => ({
    key: a.key, name: a.name, factionKey: a.faction_key, wikiTitle: a.wiki_title,
  })));

  const roles = load<any>("roles");
  await upsertRows(tx, s.roles, s.roles.key, roles.map((r) => ({
    key: r.key, name: r.name, wikiTitle: r.wiki_title, factionKey: r.faction_key,
    alignmentKey: r.alignment_key, roleType: r.role_type, isUnique: r.is_unique,
    priority: r.priority, attack: r.attack, defense: r.defense, summary: r.summary, goal: r.goal,
    abilities: r.abilities, attributes: r.attributes, special: r.special,
    actionOther: r.action_other, actionNone: r.action_none, winWith: r.win_with, mustKill: r.must_kill,
    restrictions: r.restrictions, uses: r.uses, sheriffResult: r.sheriff_result,
    investigatorResult: r.investigator_result, consigliereResult: r.consigliere_result,
    mvp: r.mvp, iconFile: r.icon_file, skinFile: r.skin_file, raw: r.raw,
    // `implemented` no va aquí: lo marca el desarrollo y el seed nunca lo sobrescribe.
  })));
  // Atributos: se reemplazan completos para cada rol (no tienen referencias desde partidas).
  for (const r of roles) {
    await tx.delete(s.roleAttributes).where(eq(s.roleAttributes.roleKey, r.key));
    const lines: string[] = r.attribute_lines ?? [];
    if (lines.length) {
      await tx.insert(s.roleAttributes).values(
        lines.map((attribute, i) => ({ roleKey: r.key, position: i + 1, attribute })),
      );
    }
  }

  // Catálogo puro: se reemplaza entero para que no sobrevivan modos retirados (p. ej. los de ToS2).
  await tx.delete(s.phaseTimings);
  await upsertRows(tx, s.phaseTimings, [s.phaseTimings.mode, s.phaseTimings.phase], load<any>("phase_timings").map((p) => ({
    mode: p.mode, phase: p.phase, seconds: p.seconds, sortOrder: p.sort_order,
  })));

  await upsertRows(tx, s.gameModes, s.gameModes.key, load<any>("game_modes").map((m) => ({
    key: m.key, name: m.name, players: m.players, roles: m.roles, notes: m.notes, sourcePage: m.source_page,
  })));

  await upsertRows(tx, s.hostRules, s.hostRules.position, load<any>("host_rules").map((h) => ({
    position: h.position, rule: h.rule,
  })));

  await upsertRows(tx, s.votingThresholds, s.votingThresholds.alive, load<any>("voting_thresholds").map((v) => ({
    alive: v.alive, votesRequired: v.votes_required,
  })));

  await upsertRows(tx, s.modifiers, s.modifiers.key, load<any>("modifiers").map((m) => ({
    key: m.key, name: m.name, category: m.category, description: m.description,
    gameModes: m.game_modes, sourcePage: m.source_page,
  })));

  await upsertRows(tx, s.wikiImages, s.wikiImages.name, load<any>("wiki_images").map((i) => ({
    name: i.name, url: i.url, bytes: i.bytes, mime: i.mime, existsInWiki: i.exists_in_wiki,
    localFile: i.local_file, referencedBy: i.referenced_by,
  })));
}

async function seedWikiPages(tx: any, gz: Buffer, textIndex: { title: string }[]) {
  const inScope = new Set(textIndex.map((x) => x.title));
  const lines = gunzipSync(gz).toString("utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    const r = JSON.parse(line) as {
      title: string; pageid?: number; touched?: string; timestamp?: string;
      wikitext: string; categories: string[];
    };
    const redirect = /^\s*#REDIRECT\s*\[\[([^\]|#]+)/i.exec(r.wikitext);
    const tag = /\((TiS|BToS1|BToS2|ToS)\)\s*$/.exec(r.title);
    const row = {
      title: r.title,
      pageId: r.pageid ?? null,
      isRedirect: Boolean(redirect),
      redirectTarget: redirect?.[1]?.trim() ?? null,
      versionTag: tag?.[1] ?? null,
      inScope: inScope.has(r.title),
      categories: r.categories,
      wikitext: r.wikitext,
      touchedAt: r.touched ? new Date(r.touched) : null,
      lastEditAt: r.timestamp ? new Date(r.timestamp) : null,
    };
    await tx.insert(s.wikiPages).values(row).onConflictDoUpdate({ target: s.wikiPages.title, set: row });
  }
}
