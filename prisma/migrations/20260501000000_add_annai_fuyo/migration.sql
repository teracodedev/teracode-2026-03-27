-- 案内不要フラグを世帯員テーブルに追加
ALTER TABLE "HouseholderMember" ADD COLUMN IF NOT EXISTS "annaiFuyo" BOOLEAN NOT NULL DEFAULT false;
