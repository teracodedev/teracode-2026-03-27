-- CreateTable
CREATE TABLE "GraveContractHistory" (
    "id" TEXT NOT NULL,
    "graveContractId" TEXT NOT NULL,
    "householderName" TEXT NOT NULL,
    "householderKana" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "GraveContractHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GraveContractHistory" ADD CONSTRAINT "GraveContractHistory_graveContractId_fkey" FOREIGN KEY ("graveContractId") REFERENCES "GraveContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
