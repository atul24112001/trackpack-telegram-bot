import { Networks } from ".";
import { prisma } from "../db";

export class Solana extends Networks {
  constructor() {
    super("Solana");
  }

  //   override createHDWallet(mnemonic: string): Promise<void> {
  //     const seed = this.getSeed(mnemonic);
  //     const walletsCount = await prisma.wallet;
  //   }
}
