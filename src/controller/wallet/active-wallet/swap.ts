import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { ActiveWallets, Swaps, state } from "../../../lib/state";
import { Networks } from "../../../lib/wallet";
import { activateWallet } from "../activateWallet";
import axios from "axios";

const Buttons = [
  [
    {
      text: "Solana",
      switch_inline_query_current_chat:
        "So11111111111111111111111111111111111111112",
    },
    {
      text: "USDT",
      switch_inline_query_current_chat:
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    },
  ],
  [
    {
      text: "USDC",
      switch_inline_query_current_chat:
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    },
  ],
];

export async function swap(
  userId: number,
  text: string,
  sendMessage: (
    message: string,
    pin?: boolean,
    buttons?: InlineKeyboardButton[][]
  ) => void,
  password: string
) {
  let currentState = state.get(userId);
  const activeWallet = ActiveWallets.get(userId)?.wallet;
  if (!currentState) {
    currentState = {
      creatingMnemonic: null,
      creatingWallet: null,
      importMnemonics: null,
      lastUpdated: new Date().getTime(),
      mnemonics: null,
    };
  }
  if (!activeWallet) {
    sendMessage("Please activate a wallet and try again");
    await activateWallet(userId, text, sendMessage);
    return;
  }

  if (text === "cancel") {
    state.set(userId, {
      ...currentState,
      swapping: undefined,
    });
    sendMessage("Swap cancelled");
    return;
  }

  if (!currentState.swapping) {
    sendMessage(
      "Please provide address of token that you want to sell\n\nExamples:\n'So11111111111111111111111111111111111111112' for Solana\n'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' for USDT\n\nWe have listed some tokens if you don't found your token please manually enter desired token to sell\n\n",
      false,
      Buttons
    );
    state.set(userId, {
      ...currentState,
      swapping: {
        sellingToken: null,
        swapWith: null,
        amount: null,
      },
    });
    return;
  }

  const network = Networks[activeWallet.network];

  if (currentState.swapping && !currentState.swapping.sellingToken) {
    const selectedToken = await network.getTokenByAddress(text);

    if (!selectedToken) {
      sendMessage("Token not found please enter correct address");
      return;
    }
    state.set(userId, {
      ...currentState,
      swapping: {
        sellingToken: {
          ...selectedToken,
        },
        swapWith: null,
        amount: null,
      },
    });
    sendMessage(
      `Ok, you have selected ${selectedToken.name} to sell, now enter the address of token you want to swap ${selectedToken.name} with.\n\n if this is incorrect type /cancel to exist the swap.`,
      false,
      Buttons
    );

    return;
  }
  if (
    currentState.swapping &&
    currentState.swapping.sellingToken &&
    !currentState.swapping.swapWith
  ) {
    const selectedToken = await network.getTokenByAddress(text);

    if (!selectedToken) {
      sendMessage("Token not found please enter correct address");
      return;
    }
    state.set(userId, {
      ...currentState,
      swapping: {
        ...currentState.swapping,
        swapWith: selectedToken,
        amount: null,
      },
    });
    sendMessage(
      `Perfect, you have selected ${selectedToken.name} to swap your ${currentState.swapping.sellingToken.name}\nPlease enter the amount of ${currentState.swapping.sellingToken.name} you want to sell`
    );

    return;
  }

  const { sellingToken, swapWith, amount } = currentState.swapping;
  if (sellingToken && swapWith && !amount) {
    const amountOfTokenToSell = parseFloat(text);
    if (isNaN(amountOfTokenToSell)) {
      sendMessage("Please enter valid amount in smallest unit");
      return;
    }
    let currentBalance: bigint | null = null;
    if (sellingToken.address === network.address) {
      const balance = await network.getBalance(activeWallet.publicKey);
      currentBalance = BigInt(balance);
    } else {
      const balance = await network.getTokenBalance(
        activeWallet.publicKey,
        sellingToken.address
      );
      currentBalance = balance;
    }

    if (!currentBalance) {
      sendMessage("Insufficient balance or Invalid token");
      return;
    }
    if (amountOfTokenToSell && currentBalance < BigInt(amountOfTokenToSell)) {
      return sendMessage("Insufficient balance");
    }

    state.set(userId, {
      ...currentState,
      swapping: {
        ...currentState.swapping,
        amount: amountOfTokenToSell,
      },
    });
    sendMessage(
      "Please enter slippage between 10 to 1000\n\n 10 is 0.1% of slippage\n1000 is 10% of slippage"
    );
    return;
  }

  const swapState = Swaps.get(userId);
  if (swapState && text === "confirm") {
    sendMessage("Please wait we are processing your swap...");
    try {
      const {
        data: { swapTransaction },
      } = await axios.post("https://quote-api.jup.ag/v6/swap", {
        quoteResponse: swapState.data,
        userPublicKey: activeWallet.publicKey,
        wrapAndUnwrapSol: true,
      });
      await network.initiateTransaction(
        activeWallet.privateKey,
        swapTransaction,
        password
      );
      sendMessage("Swap successful");
    } catch (error) {
      console.log(error);
      if (error instanceof Error) {
        sendMessage(
          "Swap unsuccessful, something went wrong\n\n " + error.message
        );
      }
    }
    Swaps.delete(userId);
    state.delete(userId);
    return;
  }

  if (sellingToken && swapWith && amount) {
    const slippage = parseInt(text);
    if (slippage < 10 || slippage > 1000) {
      sendMessage("Please enter slippage between 10 to 1000");
      return;
    }
    sendMessage("Please hold getting quotes");
    try {
      const { data } = await axios.get("https://quote-api.jup.ag/v6/quote", {
        params: {
          inputMint: sellingToken.address,
          outputMint: swapWith.address,
          amount: amount,
          slippageBps: slippage,
        },
      });
      Swaps.set(userId, {
        lastUpdated: new Date().getTime(),
        data,
      });
      sendMessage(
        `You will get ${data.outAmount / swapWith.decimals} ${
          swapWith.name
        }\n\n Please type 'confirm' to accept the swap or 'cancel' to reject it\nAfter 10 minutes swap will be automatically cancelled`
      );
    } catch (error) {
      console.log(error);
    }
    return;
  }
}
