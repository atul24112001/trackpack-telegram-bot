import { Mnemonic, Network, Wallet, WalletType } from "@prisma/client";

export const state = new Map<
  number,
  {
    lastUpdated: number;
    creatingWallet: null | {
      name: string | null;
      type: WalletType | null;
      network: Network | null;
      mnemonic: number | null;
    };
    importMnemonics: null | {
      name: null | string;
      mnemonic: null | string;
    };
    creatingMnemonic: null | {
      name: null | string;
      mnemonic: null | string;
    };
    mnemonics: null | Mnemonic[];
    activateWallet?: {
      wallets: number[];
      target: number;
    };
  }
>();

interface WalletModel extends Wallet {
  mnemonic: Mnemonic;
}

export const WALLETS = new Map<
  number,
  {
    wallets: WalletModel[];
    lastUpdater: number;
  }
>();

export const ActiveWallets = new Map<number, WalletModel>();
