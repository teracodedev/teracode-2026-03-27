-- Remove Access-style extended fields from Householder
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "kubun";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "isSodai";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "tantosodai";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "yago";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "chiku";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "motochiku";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "chikuJunjo";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "omairiJunjo";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "annaiYohi";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "nenkaiannaIYohi";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "tsukikiYohi";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "noteNoPrint";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "preDharmaName";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "preDharmaNameKana";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "templeRole";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "templeRoleNote";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "classification1";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "classification2";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "classification3";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "classification4";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "classification5";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "classification6";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "classification7";
ALTER TABLE "Householder" DROP COLUMN IF EXISTS "classification8";

-- Remove Access-style extended fields from HouseholderMember
ALTER TABLE "HouseholderMember" DROP COLUMN IF EXISTS "classification";
ALTER TABLE "HouseholderMember" DROP COLUMN IF EXISTS "affiliation";
ALTER TABLE "HouseholderMember" DROP COLUMN IF EXISTS "affiliationRole";
ALTER TABLE "HouseholderMember" DROP COLUMN IF EXISTS "affiliationNote";
ALTER TABLE "HouseholderMember" DROP COLUMN IF EXISTS "templeRole";
ALTER TABLE "HouseholderMember" DROP COLUMN IF EXISTS "templeRoleNote";
ALTER TABLE "HouseholderMember" DROP COLUMN IF EXISTS "annaiFuyo";
ALTER TABLE "HouseholderMember" DROP COLUMN IF EXISTS "keijiFuyo";
ALTER TABLE "HouseholderMember" DROP COLUMN IF EXISTS "hatsuu";

-- Drop SermonRecord table
DROP TABLE IF EXISTS "SermonRecord";
