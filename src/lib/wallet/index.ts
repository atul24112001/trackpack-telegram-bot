import { Network } from "@prisma/client";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";

export class Networks {
  public id: Network;

  constructor(id: Network) {
    this.id = id;
  }

  public getSeed(_mnemonic?: string) {
    const mnemonic = _mnemonic || generateMnemonic();
    const seed = mnemonicToSeedSync(mnemonic);
    return seed;
  }

  async createHDWallet(mnemonic: string) {}

  async createWallet(mnemonic: string) {}
}
