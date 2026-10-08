CREATE TYPE "public"."match_status" AS ENUM('lobby', 'playing', 'finished', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."narration_source" AS ENUM('gemini', 'template');--> statement-breakpoint
CREATE TYPE "public"."player_status" AS ENUM('alive', 'dead', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'mafia', 'dead', 'private');--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"day" date PRIMARY KEY NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"match_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"visibility" "visibility" NOT NULL,
	"audience_player_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_match_id_seq_pk" PRIMARY KEY("match_id","seq"),
	CONSTRAINT "events_private_needs_audience" CHECK (("events"."visibility" <> 'private') or ("events"."audience_player_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "match_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"seat" integer NOT NULL,
	"nick" varchar(24) NOT NULL,
	"role_key" text,
	"faction" text,
	"status" "player_status" DEFAULT 'alive' NOT NULL,
	"death_reason" text,
	"died_at_seq" integer,
	"reconnect_token_hash" text NOT NULL,
	"connected" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "match_players_seat_range" CHECK ("match_players"."seat" between 1 and 15)
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_code" varchar(8) NOT NULL,
	"status" "match_status" DEFAULT 'lobby' NOT NULL,
	"config" jsonb NOT NULL,
	"engine_version" text NOT NULL,
	"winner_faction" text,
	"end_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "narrations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"match_id" uuid NOT NULL,
	"event_seq" integer,
	"text" text NOT NULL,
	"source" "narration_source" NOT NULL,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_player_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"match_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "snapshots_match_id_seq_pk" PRIMARY KEY("match_id","seq")
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_audience_player_id_match_players_id_fk" FOREIGN KEY ("audience_player_id") REFERENCES "public"."match_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "narrations" ADD CONSTRAINT "narrations_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_match_player_id_match_players_id_fk" FOREIGN KEY ("match_player_id") REFERENCES "public"."match_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_match_visibility_idx" ON "events" USING btree ("match_id","visibility");--> statement-breakpoint
CREATE UNIQUE INDEX "match_players_seat_uidx" ON "match_players" USING btree ("match_id","seat");--> statement-breakpoint
CREATE UNIQUE INDEX "match_players_nick_uidx" ON "match_players" USING btree ("match_id","nick");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_active_room_code_idx" ON "matches" USING btree ("room_code") WHERE "matches"."status" in ('lobby', 'playing');--> statement-breakpoint
CREATE INDEX "matches_status_idx" ON "matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "narrations_match_seq_idx" ON "narrations" USING btree ("match_id","event_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_uidx" ON "push_subscriptions" USING btree ("endpoint");