import { generateMnemonic } from "bip39";
import { encryptMessage } from "../../lib/function";
import { prisma } from "../../lib/db";
import { state } from "../../lib/state";

export async function createMnemonic(
  userId: number,
  text: string,
  sendMessage: (message: string) => void
) {
  try {
    const currentUserState = state.get(userId);
    if (text.trim().length < 5) {
      sendMessage("Name should contain at least 5 letters");
      return;
    }
    const generatedMnemonic = generateMnemonic();
    const encryptedMnemonic = encryptMessage(generatedMnemonic);
    await prisma.mnemonic.create({
      data: {
        userId,
        mnemonic: JSON.stringify(encryptedMnemonic),
        name: text,
      },
    });
    if (currentUserState) {
      state.set(userId, {
        ...currentUserState,
        creatingMnemonic: null,
      });
    }
    sendMessage(
      `Mnemonic generated successfully:\n\nName: ${text}\nMnemonic: ${generatedMnemonic}`
    );
  } catch (error) {
    if (error instanceof Error) {
      sendMessage(
        "Something went wrong, please try again\n\n " + error.message
      );
    }
  }
}
