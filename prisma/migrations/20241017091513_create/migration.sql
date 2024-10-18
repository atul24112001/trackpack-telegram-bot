/*
  Warnings:

  - You are about to drop the column `mnemonic` on the `Wallet` table. All the data in the column will be lost.
  - Added the required column `mnemonicId` to the `Wallet` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Wallet" DROP COLUMN "mnemonic",
ADD COLUMN     "mnemonicId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Mnemonic" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "mnemonic" TEXT NOT NULL,

    CONSTRAINT "Mnemonic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mnemonic_mnemonic_key" ON "Mnemonic"("mnemonic");

-- AddForeignKey
ALTER TABLE "Mnemonic" ADD CONSTRAINT "Mnemonic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_mnemonicId_fkey" FOREIGN KEY ("mnemonicId") REFERENCES "Mnemonic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
