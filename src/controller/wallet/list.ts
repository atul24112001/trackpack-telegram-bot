import { prisma } from "../../lib/db";
import { WalletsState } from "../../lib/state";

export async function listWallets(
  userId: number,
  sendMessage: (message: string) => void
) {
  try {
    let cacheWallets = WalletsState.get(userId)?.wallets;
    if (!cacheWallets) {
      console.log("Fetching");
      cacheWallets = await prisma.wallet.findMany({
        where: {
          userId,
        },
        include: {
          mnemonic: true,
        },
      });
      WalletsState.set(userId, {
        wallets: cacheWallets,
        lastUpdater: new Date().getTime(),
      });
    }

    if (cacheWallets.length === 0) {
      sendMessage("No wallet yet! add one /create or /import");
      return;
    }

    sendMessage(
      cacheWallets.reduce((prev, curr, index) => {
        prev += `Name: ${curr.name}\nPublic Key: ${curr.publicKey}\nMnemonic:${curr.mnemonic.name}\n\n`;
        return prev;
      }, "Your wallets\n\n")
    );
  } catch (error) {
    if (error instanceof Error) {
      sendMessage(
        "Something went wrong, please try again\n\n " + error.message
      );
    }
  }
}
