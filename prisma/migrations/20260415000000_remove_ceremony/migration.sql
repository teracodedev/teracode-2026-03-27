-- Drop CeremonyParticipant and Ceremony tables along with their enums.

-- DropForeignKey
ALTER TABLE "CeremonyParticipant" DROP CONSTRAINT IF EXISTS "CeremonyParticipant_ceremonyId_fkey";

-- DropForeignKey
ALTER TABLE "CeremonyParticipant" DROP CONSTRAINT IF EXISTS "CeremonyParticipant_householderId_fkey";

-- DropTable
DROP TABLE IF EXISTS "CeremonyParticipant";

-- DropTable
DROP TABLE IF EXISTS "Ceremony";

-- DropEnum
DROP TYPE IF EXISTS "CeremonyStatus";

-- DropEnum
DROP TYPE IF EXISTS "CeremonyType";
