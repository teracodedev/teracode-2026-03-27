-- CreateTable
CREATE TABLE "RelatedLedger" (
    "id" TEXT NOT NULL,
    "householderId" TEXT NOT NULL,
    "relatedHouseholderId" TEXT NOT NULL,
    "relation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelatedLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RelatedLedger_relatedHouseholderId_idx" ON "RelatedLedger"("relatedHouseholderId");

-- CreateIndex
CREATE UNIQUE INDEX "RelatedLedger_householderId_relatedHouseholderId_key" ON "RelatedLedger"("householderId", "relatedHouseholderId");

-- AddForeignKey
ALTER TABLE "RelatedLedger" ADD CONSTRAINT "RelatedLedger_householderId_fkey" FOREIGN KEY ("householderId") REFERENCES "Householder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedLedger" ADD CONSTRAINT "RelatedLedger_relatedHouseholderId_fkey" FOREIGN KEY ("relatedHouseholderId") REFERENCES "Householder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
