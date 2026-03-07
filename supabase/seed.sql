-- ScoreMates Seed Data
-- Run this after schema.sql

insert into settings (key, value, description) values
  ('scoring', '{"exact_score": 4, "goal_difference": 3, "correct_winner": 2}', 'Puanlama sistemi'),
  ('api_football', '{"api_key": "", "league_id": "203", "season": "2024", "base_url": "https://v3.football.api-sports.io"}', 'API-Football (RapidAPI) ayarları'),
  ('app', '{"site_name": "ScoreMates", "max_leagues_per_user": 5}', 'Uygulama genel ayarları')
on conflict (key) do update set value = excluded.value, updated_at = now();
