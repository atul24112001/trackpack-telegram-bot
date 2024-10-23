import { config } from "dotenv";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { prisma } from "./lib/db";
import {
  importMnemonic,
  createMnemonic,
  listMnemonic,
} from "./controller/mnemonic";
import { listWallets, createWallet } from "./controller/wallet";
import {
  ActiveWallets,
  Passwords,
  Swaps,
  WalletsState,
  State,
} from "./lib/state";
import cron from "node-cron";
import { activateWallet } from "./controller/wallet/activateWallet";
import { checkBalance } from "./controller/wallet/active-wallet/balance";
import { getTokens } from "./controller/wallet/active-wallet/tokens";
import { swap } from "./controller/wallet/active-wallet";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";

config();

const bot = new Telegraf(process.env.BOT_TOKEN as string);
bot.start(async (ctx) => {
  const userData = ctx.from;
  let userExist = await prisma.user.findFirst({
    where: { id: userData.id },
  });

  if (!userExist) {
    userExist = await prisma.user.create({
      data: {
        firstName: userData.first_name,
        lastName: userData.last_name || "",
        id: userData.id,
      },
    });
  }

  ctx.reply(
    `Hello ${userExist.firstName}, how can i help you ?? please enter /help to know more.`
  );
});

const commands: { [key: string]: string | { [key: string]: string } } = {
  list: "Lists all the wallets that you have created/imported",
  create: "To create a new wallet",
  import: "To import a wallet using mnemonic",
  importmnemonic: "To import your mnemonic",
  createmnemonic: "To create a new mnemonic for you",
  mnemonics: "Lists all the mnemonics that you have added",
  activate: "Activate one of created wallet",
  cancel: "Reset state & process",
  wallet: {
    balance: "Check balance in activate wallet",
    tokens: "Lists tokens/coins in active",
    swap: "Swap tokens",
  },
};

// bot.on("callback_query", (ctx) => {
//   const callbackData = ctx.callbackQuery.data;
//   ctx.sendMessage(callbackData);
// });

bot.on(message("text"), async (ctx) => {
  if (ctx.from.is_bot) {
    console.log("From bot ", ctx.text);
    return;
  }

  const textArray = ctx.message.text
    .trim()
    .split(" ")
    .filter((word) => word.trim() !== "");
  let text = textArray[0];
  if (text === "@TrackpackDevBot" || text === "@TrackpackVaultbot") {
    text = textArray[1];
  }

  const userId = ctx.from.id;
  const lastUpdated = new Date().getTime();
  const _activateWallet = ActiveWallets.get(userId)?.wallet;
  const password = Passwords.get(userId);
  const currentUserState = State.get(userId) || {
    creatingWallet: null,
    importMnemonics: null,
    lastUpdated,
    mnemonics: null,
    creatingMnemonic: null,
  };

  if (ctx.text === "/cancel") {
    State.delete(userId);
    Passwords.delete(userId);
    ActiveWallets.delete(userId);
    Swaps.delete(userId);
    reply("Reset successful");
    return;
  }

  if (currentUserState.enteringPassword) {
    if (text.trim().length < 8) {
      reply("Password length should be more than equals to 8");
      return;
    }
    Passwords.set(userId, {
      lastUpdated: new Date().getTime(),
      password: text.trim(),
    });
    State.delete(userId);
    await ctx.deleteMessage(ctx.message.message_id);
    reply("Welcome");
    return;
  }
  if (!password) {
    State.set(userId, {
      ...currentUserState,
      enteringPassword: true,
    });

    reply(
      "Please enter the password first\n\nNote: Password that will encrypt all your private key, if you forget your password you won't be able to decrypt your private key as we don't save your password nor verify it."
    );
    return;
  }

  if (!_activateWallet) {
    await ctx.unpinAllChatMessages();
  }

  function reply(
    message: string,
    pin?: boolean,
    buttons?: InlineKeyboardButton[][]
  ) {
    ctx
      .reply(message, {
        reply_markup: {
          inline_keyboard: buttons || [[]],
        },
      })
      .then((message) => {
        if (pin) {
          ctx.pinChatMessage(message.message_id);
        }
      });
  }

  if (currentUserState?.importMnemonics) {
    await importMnemonic(userId, ctx.text, reply, password.password);
    return;
  }

  if (currentUserState?.creatingMnemonic) {
    await createMnemonic(userId, ctx.text, reply, password.password);

    return;
  }

  if (currentUserState?.creatingWallet) {
    await createWallet(userId, ctx.text, reply, password.password);
    return;
  }

  if (text === "/create") {
    State.set(userId, {
      creatingWallet: {
        name: null,
        network: null,
        type: null,
        mnemonic: null,
      },
      importMnemonics: null,
      creatingMnemonic: null,
      lastUpdated,
      mnemonics: currentUserState?.mnemonics || null,
    });
    ctx.reply("To create a new wallet, first give your wallet a name");
    return;
  }
  if (text === "/list") {
    await listWallets(userId, reply);
    return;
  }
  if (text === "/createmnemonic") {
    reply("Please give a name to the mnemonic");
    State.set(userId, {
      ...currentUserState,
      lastUpdated,
      creatingMnemonic: {
        mnemonic: null,
        name: null,
      },
    });
    return;
  }
  if (text === "/importmnemonic") {
    reply("Please give a name to the mnemonic");
    State.set(userId, {
      ...currentUserState,
      lastUpdated,
      importMnemonics: {
        mnemonic: null,
        name: null,
      },
    });
    return;
  }
  if (text === "/activate" || currentUserState.activateWallet) {
    await activateWallet(userId, text, reply);
    return;
  }
  if (text === "/mnemonics") {
    await listMnemonic(userId, text, reply, password.password);
    return;
  }

  if (text === "/balance") {
    await checkBalance(userId, text, reply);
    return;
  }

  if (text === "/tokens") {
    await getTokens(userId, text, reply);
    return;
  }

  if (text === "/swap" || currentUserState.swapping) {
    await swap(userId, text, reply, password.password);
    return;
  }

  ctx.reply(
    Object.keys(commands).reduce((prev, command) => {
      const details = commands[command];
      if (typeof details === "string") {
        prev += `/${command}: ${commands[command]}\n`;
      } else {
        prev += Object.keys(details).reduce((p, c) => {
          p += `/${c}: ${details[c]}\n`;
          return p;
        }, "\n These are the commands you can use after a wallet is active.\n\n");
      }
      return prev;
    }, `This are the command you can use:\n\n`)
  );
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

cron.schedule("0 * * * *", () => {
  console.log("Running the task every hour:", new Date().toLocaleString());
  const currentTime = new Date().getTime();

  State.forEach((value, key) => {
    if (value.lastUpdated < currentTime - 3600000) {
      State.delete(key);
    }
  });
  WalletsState.forEach((value, key) => {
    if (value.lastUpdater < currentTime - 3600000) {
      WalletsState.delete(key);
    }
  });
  Passwords.forEach((value, key) => {
    if (value.lastUpdated < currentTime - 3600000) {
      Passwords.delete(key);
    }
  });
  ActiveWallets.forEach((value, key) => {
    if (value.lastUpdated < currentTime - 3600000) {
      ActiveWallets.delete(key);
    }
  });
});
