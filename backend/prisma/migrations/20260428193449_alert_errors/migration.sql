-- AlterTable
ALTER TABLE "leagues" ALTER COLUMN "lock_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "alert_errors" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "group_id" INTEGER,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_errors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_alert_errors_chain_time" ON "alert_errors"("chain_id", "created_at");
