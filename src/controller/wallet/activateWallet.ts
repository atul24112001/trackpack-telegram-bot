import { prisma } from "../../lib/db";
import { ActiveWallets, WALLETS, state } from "../../lib/state";

export async function activateWallet(
  userId: number,
  text: string,
  sendMessage: (message: string, pin?: boolean) => void
) {
  const currentUserState = state.get(userId);
  const lastUpdated = new Date().getTime();

  if (!currentUserState?.activateWallet) {
    const cacheWallets = WALLETS.get(userId)?.wallets;
    const wallets =
      cacheWallets ||
      (await prisma.wallet.findMany({
        where: {
          userId,
        },
        include: {
          mnemonic: true,
        },
      }));
    let message = wallets.reduce((prev, curr) => {
      prev += `Name: ${curr.name}\nPublicKey: ${curr.publicKey}`;
      return prev;
    }, "Enter the serial number wallet you want to activate\n\n");
    state.set(userId, {
      creatingMnemonic: null,
      creatingWallet: null,
      importMnemonics: null,
      lastUpdated,
      mnemonics: null,
      activateWallet: {
        target: 0,
        wallets: wallets.map((wallet) => wallet.id),
      },
    });
    sendMessage(message);
    return;
  }

  const target = parseInt(text);
  if (isNaN(target)) {
    sendMessage("Please input valid number");
    return;
  }
  if (currentUserState?.activateWallet?.target === 0) {
    const activateWalletId =
      currentUserState?.activateWallet.wallets[target - 1];
    if (!activateWalletId) {
      sendMessage("Wallet not found");
      return;
    }
    const activeWallet = await prisma.wallet.findFirst({
      where: {
        id: activateWalletId,
      },
      include: {
        mnemonic: true,
      },
    });
    if (!activeWallet) {
      sendMessage("Wallet not found");
      return;
    }
    ActiveWallets.set(userId, activeWallet);
    state.delete(userId);
    sendMessage(
      `Wallet naming ${activateWallet.name} is active now you can running commands like:\n\n/balance - Get current balance\n/tokens - Get all tokens & their balance`
    );
  }
}