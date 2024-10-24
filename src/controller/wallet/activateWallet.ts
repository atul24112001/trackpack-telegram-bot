import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { prisma } from "../../lib/db";
import { ActiveWallets, WalletsState, State } from "../../lib/state";

export async function activateWallet(
  userId: number,
  text: string,
  sendMessage: (
    message: string,
    pin?: boolean,
    buttons?: InlineKeyboardButton[][]
  ) => void
) {
  const currentUserState = State.get(userId);
  const lastUpdated = new Date().getTime();

  if (!currentUserState?.activateWallet) {
    const cacheWallets = WalletsState.get(userId)?.wallets;
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
    if (wallets.length === 0) {
      sendMessage(
        "You don't have any wallet yet please add one.\n\n/create or /import"
      );
      return;
    }

    State.set(userId, {
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
    sendMessage(
      "Please select the wallet you want to activate",
      false,
      wallets.map((wallet, index) => [
        {
          text: wallet.name,
          switch_inline_query_current_chat: `${index + 1}`,
        },
      ])
    );
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
    ActiveWallets.set(userId, {
      lastUpdated: new Date().getTime(),
      wallet: activeWallet,
    });
    State.delete(userId);
    sendMessage(`Active Wallet: ${activeWallet.publicKey}`, true);
    sendMessage(
      `Wallet naming ${activeWallet.name} is active now you can running commands like:\n\n/balance - Get current balance\n/tokens - Get all tokens & their balance\n/swap - To swap tokens`
    );
  }
}
