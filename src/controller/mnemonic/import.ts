import { encryptMessage } from "../../lib/function";
import { prisma } from "../../lib/db";
import { State } from "../../lib/state";

export async function importMnemonic(
  userId: number,
  text: string,
  sendMessage: (message: string) => void,
  secret: string
) {
  try {
    const currentUserState = State.get(userId);
    const { name } = currentUserState?.importMnemonics || {};

    const lastUpdated = new Date().getTime();
    if (!name) {
      if (text.trim().length < 5) {
        sendMessage("Name should contain at least 5 letters");
        return;
      }
      State.set(userId, {
        creatingWallet: null,
        importMnemonics: {
          name: text,
          mnemonic: null,
        },
        creatingMnemonic: null,
        lastUpdated,
        mnemonics: currentUserState?.mnemonics || null,
      });
      sendMessage(
        "Please enter 12 word mnemonics in this formate (name house mud glass...)"
      );
      return;
    }

    const mnemonicArray = text
      .split(" ")
      .map((word) => word.trim())
      .filter((word) => word !== "");
    if (mnemonicArray.length !== 12) {
      sendMessage("Mnemonic should be 12 words eg: 'house table car...'");
      return;
    }
    await prisma.mnemonic.create({
      data: {
        userId,
        name,
        mnemonic: JSON.stringify(
          encryptMessage(mnemonicArray.join(" "), secret)
        ),
      },
    });
    if (currentUserState) {
      State.set(userId, {
        ...currentUserState,
        importMnemonics: null,
      });
    }
    sendMessage(`Mnemonic added successfully`);
  } catch (error) {
    if (error instanceof Error) {
      sendMessage(
        "Something went wrong, please try again\n\n " + error.message
      );
    }
  }
}
