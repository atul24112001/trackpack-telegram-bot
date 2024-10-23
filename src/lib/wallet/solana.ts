import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import * as TokenProgram from "@solana/spl-token";
import { TokenListProvider } from "@solana/spl-token-registry";
import { decryptMessage } from "../function";

const connection = new Connection(
  "https://api.devnet.solana.com"
  // `https://solana-devnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
);
type Metadata = {
  name: string;
  symbol: string;
  image?: string;
};

export async function getBalance(publicKey: string) {
  const _publicKey = new PublicKey(publicKey);
  const data = await connection.getBalance(_publicKey);
  return data;
}

export async function getAllTokens() {
  new TokenListProvider().resolve().then((tokens) => {
    const tokenList = tokens.filterByClusterSlug("mainnet-beta").getList();
    tokenList.forEach((token) =>
      console.log(`${token.name}: ${token.address}`)
    );
  });
}

export async function getTokenByAddress(address: string) {
  const tokens = await new TokenListProvider().resolve();
  const tokenList = tokens.filterByClusterSlug("mainnet-beta").getList();
  return (
    tokenList.find((token) => {
      return token.address === address;
    }) || null
  );
}

export async function getTokens(publicKey: string) {
  const _publicKey = new PublicKey(publicKey);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    _publicKey,
    {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    }
  );

  const tokens = await Promise.all(
    tokenAccounts.value.map(async ({ account }) => {
      const accountInfo = account.data.parsed.info;
      const balance = parseInt(accountInfo.tokenAmount.amount);
      const mint = accountInfo.mint;
      const mintAddress = new PublicKey(mint);
      const mintInfo = await TokenProgram.getMint(connection, mintAddress);

      const metaplex = Metaplex.make(connection);
      const metadataAccount = metaplex
        .nfts()
        .pdas()
        .metadata({ mint: mintAddress });

      const metadataAccountInfo = await connection.getAccountInfo(
        metadataAccount
      );

      const metadata: Metadata = {
        name: "Unknown Token",
        symbol: mintAddress.toBase58(),
      };

      if (metadataAccountInfo) {
        const token = await metaplex
          .nfts()
          .findByMint({ mintAddress: mintAddress });
        metadata.image = token.json?.image;
        metadata.name = token.name;
        metadata.symbol = token.symbol;
      }

      return {
        owner: mintInfo.mintAuthority?.toBase58() || "",
        address: mint,
        balance,
        decimals: accountInfo.tokenAmount.decimals,
        metadata,
      };
    })
  );

  return tokens;
}

export async function getTokenBalance(publicKey: string, tokenAddress: string) {
  try {
    const walletPublicKey = new PublicKey(publicKey);
    const tokenMintAddress = new PublicKey(tokenAddress);
    const associatedTokenAddress = PublicKey.findProgramAddressSync(
      [
        walletPublicKey.toBuffer(),
        TokenProgram.TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      TokenProgram.TOKEN_PROGRAM_ID
    );

    const tokenAccount = await TokenProgram.getAccount(
      connection,
      associatedTokenAddress[0]
    );
    const balance = tokenAccount.amount;
    return balance;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function initiateTransaction(
  privateKey: string,
  swapTransaction: any,
  password: string
) {
  const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
  const secret = new Uint8Array(
    JSON.parse(decryptMessage(JSON.parse(privateKey), password))
  );
  const payer = Keypair.fromSecretKey(secret);
  transaction.sign([payer]);
  const latestBlockHash = await connection.getLatestBlockhash();
  const rawTransaction = transaction.serialize();
  const txid = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: true,
    maxRetries: 2,
  });
  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: txid,
  });
}

export const solanaNetwork = {
  getBalance,
  getTokens,
  getTokenByAddress,
  getTokenBalance,
  decimals: 1_000_000_000,
  address: "So11111111111111111111111111111111111111112",
  initiateTransaction,
};
