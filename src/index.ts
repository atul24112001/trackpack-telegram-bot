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
import { ActiveWallets, WALLETS, state } from "./lib/state";
import cron from "node-cron";
import { activateWallet } from "./controller/wallet/activateWallet";

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
    `Hello ${userExist.firstName}, how can i help you ?? Type /help to know more`
  );
});

bot.on(message("text"), async (ctx) => {
  if (ctx.from.is_bot) {
    return;
  }
  const text = ctx.message.text.trim().split(" ")[0];
  const userId = ctx.from.id;
  const lastUpdated = new Date().getTime();

  const currentUserState = state.get(userId) || {
    creatingWallet: null,
    importMnemonics: null,
    lastUpdated,
    mnemonics: null,
    creatingMnemonic: null,
  };

  function reply(message: string, pin?: boolean) {
    ctx.reply(message).then((message) => {
      if (pin) {
        ctx.pinChatMessage(message.message_id);
      }
    });
  }

  if (currentUserState?.importMnemonics) {
    await importMnemonic(userId, text, reply);
    return;
  }

  if (currentUserState?.creatingMnemonic) {
    await createMnemonic(userId, text, reply);

    return;
  }

  if (currentUserState?.creatingWallet) {
    await createWallet(userId, text, reply);
    return;
  }

  if (text === "/create") {
    if (
      !currentUserState ||
      !currentUserState.creatingWallet ||
      !currentUserState.creatingWallet.name
    ) {
      state.set(userId, {
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
    }
    return;
  }
  if (text === "/list") {
    await listWallets(userId, reply);
    return;
  }
  if (text === "/createmnemonic") {
    reply("Please give a name to the mnemonic");
    state.set(userId, {
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
    state.set(userId, {
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
    await listMnemonic(userId, text, reply);
    return;
  }

  if (text === "/balance") {
    const _activateWallet = ActiveWallets.get(userId);
    if (!_activateWallet) {
      reply("There is not active wallet currently please try /activate");
      return;
    }
    return;
  }

  if (text === "/tokens") {
    const _activateWallet = ActiveWallets.get(userId);
    if (!_activateWallet) {
      reply("There is not active wallet currently please try /activate");
      return;
    }
    return;
  }
  ctx.reply(
    `This are the command you can user:\n/list This will list all the wallets that you have created\n/create This will create a new wallet\n/import This will import a wallet using mnemonic\n/import_mnemonic This will import mnemonic
/create_mnemonic This is create a new mnemonic for you\n/mnemonics List all the mnemonics that you have added`
  );
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

cron.schedule("0 * * * *", () => {
  console.log("Running the task every hour:", new Date().toLocaleString());
  const currentTime = new Date().getTime() - 3600000;
  state.forEach((value, key) => {
    if (value.lastUpdated < currentTime) {
      state.delete(key);
    }
  });
  WALLETS.forEach((value: any, key) => {
    if (value.lastUpdater < currentTime) {
      WALLETS.delete(key);
    }
  });
});
