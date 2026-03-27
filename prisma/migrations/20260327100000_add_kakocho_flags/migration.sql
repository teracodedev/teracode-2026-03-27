-- 過去帳フラグフィールドを世帯員テーブルに追加
ALTER TABLE "HouseholderMember" ADD COLUMN IF NOT EXISTS "notePrintDisabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HouseholderMember" ADD COLUMN IF NOT EXISTS "meinichiFusho"     BOOLEAN NOT NULL DEFAULT false;
