-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL,
    "nenkaiPostcardSenderName" TEXT,
    "nenkaiPostcardSenderAddress" TEXT,
    "nenkaiPostcardFooter" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);
