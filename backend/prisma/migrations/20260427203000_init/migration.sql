-- CreateTable
CREATE TABLE "leagues" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_leagues_chain_id" ON "leagues"("chain_id");
