import { ActiveWallets } from "../../../lib/state";
import { Networks } from "../../../lib/wallet";
import { activateWallet } from "../activateWallet";

export async function getTokens(
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

  const tokens = await network.getTokens(activeWallet.publicKey);
  sendMessage(
    tokens.reduce((prev, curr) => {
      prev += `Name: ${curr.metadata.name}\nBalance: ${
        curr.balance / 10 ** curr.decimals || 0
      } ${curr.metadata.symbol || curr.address}\n\n`;
      return prev;
    }, "Tokens\n\n")
  );
}
