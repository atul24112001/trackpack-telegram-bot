import { Mnemonic, Network, User, Wallet, WalletType } from "@prisma/client";

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
    swapping?: {
      sellingToken: null | {
        address: string;
        name: string;
        decimals: number;
      };
      swapWith: null | {
        address: string;
        name: string;
        decimals: number;
      };
      amount: null | number;
    };
    enteringPassword?: boolean;
  }
>();

interface WalletModel extends Wallet {
  mnemonic: Mnemonic;
}

export const WalletsState = new Map<
  number,
  {
    wallets: WalletModel[];
    lastUpdater: number;
  }
>();

export const ActiveWallets = new Map<
  number,
  { lastUpdated: number; wallet: WalletModel }
>();
export const ActiveToken = new Map<number, string>();
export const Swaps = new Map<
  number,
  {
    lastUpdated: number;
    data: any;
  }
>();
export const Passwords = new Map<
  number,
  {
    lastUpdated: number;
    password: string;
  }
>();
