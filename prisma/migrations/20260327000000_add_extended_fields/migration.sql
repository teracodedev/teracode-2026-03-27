-- Add fields to Householder
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "kubun" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "isSodai" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "tantosodai" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "yago" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "chiku" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "motochiku" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "chikuJunjo" INTEGER;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "omairiJunjo" INTEGER;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "annaiYohi" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "nenkaiannaIYohi" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "tsukikiYohi" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "noteNoPrint" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "preDharmaName" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "preDharmaNameKana" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "templeRole" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "templeRoleNote" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "classification1" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "classification2" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "classification3" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "classification4" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "classification5" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "classification6" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "classification7" TEXT;
ALTER TABLE "Householder" ADD COLUMN IF NOT EXISTS "classification8" TEXT;

-- Add fields to HouseholderMember
ALTER TABLE "HouseholderMember" ADD COLUMN IF NOT EXISTS "classification" TEXT;
ALTER TABLE "HouseholderMember" ADD COLUMN IF NOT EXISTS "affiliation" TEXT;
ALTER TABLE "HouseholderMember" ADD COLUMN IF NOT EXISTS "affiliationRole" TEXT;
ALTER TABLE "HouseholderMember" ADD COLUMN IF NOT EXISTS "affiliationNote" TEXT;
ALTER TABLE "HouseholderMember" ADD COLUMN IF NOT EXISTS "templeRole" TEXT;
ALTER TABLE "HouseholderMember" ADD COLUMN IF NOT EXISTS "templeRoleNote" TEXT;
ALTER TABLE "HouseholderMember" ADD COLUMN IF NOT EXISTS "annaiFuyo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HouseholderMember" ADD COLUMN IF NOT EXISTS "keijiFuyo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HouseholderMember" ADD COLUMN IF NOT EXISTS "hatsuu" BOOLEAN NOT NULL DEFAULT false;

-- Create SermonRecord table
CREATE TABLE IF NOT EXISTS "SermonRecord" (
    "id" TEXT NOT NULL,
    "householderId" TEXT NOT NULL,
    "sermonDate" TIMESTAMP(3),
    "memberName" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SermonRecord_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SermonRecord" ADD CONSTRAINT "SermonRecord_householderId_fkey"
  FOREIGN KEY ("householderId") REFERENCES "Householder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
