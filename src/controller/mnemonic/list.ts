import { generateMnemonic } from "bip39";
import { decryptMessage, encryptMessage } from "../../lib/function";
import { prisma } from "../../lib/db";

export async function listMnemonic(
  userId: number,
  text: string,
  sendMessage: (message: string) => void
) {
  console.log(text);
  try {
    const mnemonics = await prisma.mnemonic.findMany({
      where: {
        userId,
      },
    });

    if (mnemonics.length === 0) {
      sendMessage("No mnemonic yet! try /create_mnemonic or /import_mnemonic");
    } else {
      let message = "";
      mnemonics.forEach((encryptedMnemonic, index) => {
        const mnemonic = decryptMessage(JSON.parse(encryptedMnemonic.mnemonic));
        message += `Name: ${encryptedMnemonic.name}\nMnemonic: ${mnemonic}\n\n`;
      });
      sendMessage(message);
    }
  } catch (error) {
    if (error instanceof Error) {
      sendMessage(
        "Something went wrong, please try again\n\n " + error.message
      );
    }
  }
}
