import { Mnemonic, WalletType } from "@prisma/client";
import { prisma } from "../../lib/db";
import { createMnemonic, importMnemonic, listMnemonic } from "../mnemonic";
import { decryptMessage, encryptMessage } from "../../lib/function";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { WALLETS, state } from "../../lib/state";

const networkCodes = {
  Solana: "501",
};

export async function createWallet(
  userId: number,
  text: string,
  sendMessage: (message: string) => void
) {
  try {
    const currentUserState = state.get(userId);
    if (!currentUserState || !currentUserState.creatingWallet) {
      sendMessage("Something went wrong");
      return;
    }
    const { name, network, type, mnemonic } = currentUserState.creatingWallet;
    const lastUpdated = new Date().getTime();

    if (!name) {
      state.set(userId, {
        creatingWallet: {
          name: text,
          network: null,
          type: null,
          mnemonic: null,
        },
        lastUpdated,
        importMnemonics: null,
        creatingMnemonic: null,
        mnemonics: currentUserState.mnemonics,
      });
      sendMessage(
        "Grate now please select a network type:\n 1. Solana\n 2. Ethereum"
      );
      return;
    }
    if (!network) {
      if (text !== "Solana") {
        sendMessage(
          "Sorry, We are not supporting this network, please select from other options"
        );
      } else {
        state.set(userId, {
          creatingWallet: {
            ...currentUserState.creatingWallet,
            network: text,
            type: null,
          },
          creatingMnemonic: null,
          lastUpdated,
          importMnemonics: null,
          mnemonics: currentUserState.mnemonics,
        });
        sendMessage(
          "Grate, now what type of wallet you want to create ??\n 1. SingleChain\n 2.MultiChain"
        );
      }
      return;
    }
    if (!type) {
      if (text === "MultiChain" || text === "SingleChain") {
        const mnemonics = await prisma.mnemonic.findMany({
          where: {
            userId,
          },
        });

        state.set(userId, {
          creatingWallet: {
            ...currentUserState.creatingWallet,
            type:
              text === "MultiChain"
                ? WalletType.MultiChain
                : WalletType.SingleChain,
          },
          creatingMnemonic: null,
          lastUpdated,
          importMnemonics: null,
          mnemonics,
        });

        if (mnemonics.length === 0) {
          sendMessage("Please generate or import mnemonics first.");
          state.delete(userId);
          return;
        }

        sendMessage(
          mnemonics.reduce((prev, curr, index) => {
            const _mnemonic = decryptMessage(JSON.parse(curr.mnemonic));
            prev += `${index + 1}. ${_mnemonic}\n`;
            return prev;
          }, "Please enter the serial number of mnemonic you want to use.\n")
        );
      } else {
        sendMessage("Please select between 'MultiChain' or 'SingleChain' ");
      }
      return;
    }

    if (!mnemonic) {
      const targetNumber = parseInt(text);
      const mnemonics =
        currentUserState.mnemonics ||
        (await prisma.mnemonic.findMany({ where: { id: userId } }));
      const targetMnemonic = mnemonics[targetNumber - 1];
      if (isNaN(targetNumber) || !targetMnemonic) {
        sendMessage("Please select valid mnemonic");
        return;
      }

      // const wallet =
      const walletNumber = await prisma.wallet.count({
        where: {
          userId,
          mnemonicId: targetNumber,
          type,
          network,
        },
      });

      const mnemonicString = decryptMessage(
        JSON.parse(targetMnemonic.mnemonic)
      );
      const seed = mnemonicToSeedSync(mnemonicString);
      let publicKey: string | null = null;
      let secret: Uint8Array | null = null;
      if (type === "MultiChain") {
        const path = `m/44'/${networkCodes[network]}'/${walletNumber}'/0'`;
        const derivedSeed = derivePath(path, seed.toString("hex")).key;
        secret = nacl.sign.keyPair.fromSeed(derivedSeed).secretKey;
        publicKey = Keypair.fromSecretKey(secret).publicKey.toBase58();
      } else {
        const seed32 = seed.slice(0, 32);
        secret = nacl.sign.keyPair.fromSeed(seed32).secretKey;
        publicKey = Keypair.fromSecretKey(secret).publicKey.toBase58();
      }

      if (publicKey && secret) {
        const wallet = await prisma.wallet.create({
          data: {
            network,
            privateKey: JSON.stringify(encryptMessage(JSON.stringify(secret))),
            publicKey,
            type,
            mnemonicId: targetMnemonic.id,
            userId,
            name,
          },
          include: {
            mnemonic: true,
          },
        });
        sendMessage(`Wallet created successfully\n\nAddress: ${publicKey}`);
        const walletCache = WALLETS.get(userId);
        if (walletCache) {
          WALLETS.set(userId, {
            lastUpdater: new Date().getTime(),
            wallets: [...walletCache.wallets, wallet],
          });
        }
        state.set(userId, {
          creatingMnemonic: null,
          creatingWallet: null,
          importMnemonics: null,
          lastUpdated,
          mnemonics,
        });
      }
    }
    return;
  } catch (error) {
    if (error instanceof Error) {
      sendMessage(
        "Something went wrong, please try again\n\n " + error.message
      );
    }
  }
}