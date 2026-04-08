-- CreateTable
CREATE TABLE "GravePlot" (
    "id" TEXT NOT NULL,
    "plotNumber" TEXT NOT NULL,
    "area" DOUBLE PRECISION,
    "permanentUsageFee" INTEGER,
    "managementFee" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GravePlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraveContract" (
    "id" TEXT NOT NULL,
    "gravePlotId" TEXT NOT NULL,
    "householderId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraveContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GravePlot_plotNumber_key" ON "GravePlot"("plotNumber");

-- AddForeignKey
ALTER TABLE "GraveContract" ADD CONSTRAINT "GraveContract_gravePlotId_fkey" FOREIGN KEY ("gravePlotId") REFERENCES "GravePlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraveContract" ADD CONSTRAINT "GraveContract_householderId_fkey" FOREIGN KEY ("householderId") REFERENCES "Householder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
