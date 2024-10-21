import { ActiveWallets } from "../../../lib/state";
import { Networks } from "../../../lib/wallet";
import { activateWallet } from "../activateWallet";

export async function checkBalance(
  userId: number,
  text: string,
  sendMessage: (message: string) => void
) {
  const activeWallet = ActiveWallets.get(userId);
  if (!activeWallet) {
    sendMessage("Please activate a wallet and try again");
    await activateWallet(userId, text, sendMessage);
    return;
  }

  const network = Networks[activeWallet.network];

  const balance = await network.getBalance(activeWallet.publicKey);
  sendMessage(`${balance / network.decimals} ${activeWallet.network}`);
}
