-- CreateEnum
CREATE TYPE "Network" AS ENUM ('Solana');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('MultiChain', 'SingleChain');

-- CreateTable
CREATE TABLE "Wallet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "mnemonic" TEXT NOT NULL,
    "network" "Network" NOT NULL,
    "type" "WalletType" NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
