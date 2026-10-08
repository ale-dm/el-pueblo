CREATE TABLE "alignments" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"faction_key" text NOT NULL,
	"wiki_title" text NOT NULL,
	CONSTRAINT "alignments_wiki_title_unique" UNIQUE("wiki_title")
);
--> statement-breakpoint
CREATE TABLE "catalog_meta" (
	"source" text PRIMARY KEY NOT NULL,
	"sha256" text NOT NULL,
	"seeded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factions" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"win_condition" text,
	"wiki_title" text
);
--> statement-breakpoint
CREATE TABLE "game_modes" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"players" text,
	"roles" jsonb,
	"notes" text,
	"source_page" text
);
--> statement-breakpoint
CREATE TABLE "host_rules" (
	"position" integer PRIMARY KEY NOT NULL,
	"rule" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modifiers" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"game_modes" jsonb NOT NULL,
	"source_page" text
);
--> statement-breakpoint
CREATE TABLE "phase_timings" (
	"mode" text NOT NULL,
	"phase" text NOT NULL,
	"seconds" integer,
	"sort_order" integer NOT NULL,
	CONSTRAINT "phase_timings_mode_phase_pk" PRIMARY KEY("mode","phase")
);
--> statement-breakpoint
CREATE TABLE "role_attributes" (
	"role_key" text NOT NULL,
	"position" integer NOT NULL,
	"attribute" text NOT NULL,
	CONSTRAINT "role_attributes_role_key_position_pk" PRIMARY KEY("role_key","position")
);
--> statement-breakpoint
CREATE TABLE "role_interactions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_role_key" text NOT NULL,
	"target_role_key" text,
	"kind" text NOT NULL,
	"description" text NOT NULL,
	"source_page" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_interactions_status_check" CHECK ("role_interactions"."status" in ('pending', 'verified', 'implemented'))
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"wiki_title" text NOT NULL,
	"faction_key" text NOT NULL,
	"alignment_key" text,
	"role_type" text,
	"is_unique" boolean DEFAULT false NOT NULL,
	"priority" integer,
	"attack" text,
	"defense" text,
	"summary" text,
	"goal" text,
	"abilities" text,
	"attributes" text,
	"special" text,
	"action_other" text,
	"action_none" text,
	"win_with" text,
	"must_kill" text,
	"restrictions" text,
	"uses" text,
	"sheriff_result" text,
	"investigator_result" text,
	"consigliere_result" text,
	"mvp" boolean DEFAULT false NOT NULL,
	"implemented" boolean DEFAULT false NOT NULL,
	"icon_file" text,
	"skin_file" text,
	"raw" jsonb NOT NULL,
	CONSTRAINT "roles_wiki_title_unique" UNIQUE("wiki_title")
);
--> statement-breakpoint
CREATE TABLE "voting_thresholds" (
	"alive" integer PRIMARY KEY NOT NULL,
	"votes_required" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_images" (
	"name" text PRIMARY KEY NOT NULL,
	"url" text,
	"bytes" bigint,
	"mime" text,
	"exists_in_wiki" boolean NOT NULL,
	"local_file" text,
	"referenced_by" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_pages" (
	"title" text PRIMARY KEY NOT NULL,
	"page_id" integer,
	"is_redirect" boolean DEFAULT false NOT NULL,
	"redirect_target" text,
	"version_tag" text,
	"in_scope" boolean DEFAULT false NOT NULL,
	"categories" text[] NOT NULL,
	"wikitext" text NOT NULL,
	"touched_at" timestamp with time zone,
	"last_edit_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "alignments" ADD CONSTRAINT "alignments_faction_key_factions_key_fk" FOREIGN KEY ("faction_key") REFERENCES "public"."factions"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_attributes" ADD CONSTRAINT "role_attributes_role_key_roles_key_fk" FOREIGN KEY ("role_key") REFERENCES "public"."roles"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_interactions" ADD CONSTRAINT "role_interactions_source_role_key_roles_key_fk" FOREIGN KEY ("source_role_key") REFERENCES "public"."roles"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_interactions" ADD CONSTRAINT "role_interactions_target_role_key_roles_key_fk" FOREIGN KEY ("target_role_key") REFERENCES "public"."roles"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_faction_key_factions_key_fk" FOREIGN KEY ("faction_key") REFERENCES "public"."factions"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_alignment_key_alignments_key_fk" FOREIGN KEY ("alignment_key") REFERENCES "public"."alignments"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "role_interactions_source_idx" ON "role_interactions" USING btree ("source_role_key");--> statement-breakpoint
CREATE INDEX "roles_faction_idx" ON "roles" USING btree ("faction_key");--> statement-breakpoint
CREATE INDEX "wiki_pages_scope_idx" ON "wiki_pages" USING btree ("in_scope");--> statement-breakpoint
CREATE INDEX "wiki_pages_redirect_idx" ON "wiki_pages" USING btree ("is_redirect");--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_role_key_roles_key_fk" FOREIGN KEY ("role_key") REFERENCES "public"."roles"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_faction_factions_key_fk" FOREIGN KEY ("faction") REFERENCES "public"."factions"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_faction_factions_key_fk" FOREIGN KEY ("winner_faction") REFERENCES "public"."factions"("key") ON DELETE no action ON UPDATE no action;