DROP INDEX IF EXISTS "match_players_nick_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "match_players_nick_uidx" ON "match_players" USING btree ("match_id","nick") WHERE "match_players"."nick" <> '';
