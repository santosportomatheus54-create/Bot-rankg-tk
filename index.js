const fs = require("fs");
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require("discord.js");

// ===== Configuração =====
const TOKEN = process.env.TOKEN_BOT; // <- coloque TOKEN_BOT como Environment Variable no Railway
const PREFIX = "!";

let ranking = {};
let coins = {};

// ===== Funções =====
function carregarDados() {
  if (fs.existsSync("ranking.json")) ranking = JSON.parse(fs.readFileSync("ranking.json"));
  if (fs.existsSync("coins.json")) coins = JSON.parse(fs.readFileSync("coins.json"));
}

function salvarDados() {
  fs.writeFileSync("ranking.json", JSON.stringify(ranking, null, 2));
  fs.writeFileSync("coins.json", JSON.stringify(coins, null, 2));
}

function registrarVitoria(userId) {
  if (!ranking[userId]) ranking[userId] = { vitorias: 0, derrotas: 0, streak: 0, xp: 0 };
  if (!coins[userId]) coins[userId] = 0;

  ranking[userId].vitorias += 1;
  ranking[userId].streak += 1;

  const xpGanho = 10 + ranking[userId].streak * 2;
  ranking[userId].xp += xpGanho;

  const coinsGanhas = 5 + ranking[userId].streak * 1;
  coins[userId] += coinsGanhas;

  salvarDados();
  return { xpGanho, coinsGanhas };
}

function registrarDerrota(userId) {
  if (!ranking[userId]) ranking[userId] = { vitorias: 0, derrotas: 0, streak: 0, xp: 0 };
  if (!coins[userId]) coins[userId] = 0;

  ranking[userId].derrotas += 1;
  ranking[userId].streak = 0;
  salvarDados();
}

// ===== Cliente =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ===== Ready =====
client.once("ready", () => {
  console.log(`${client.user.tag} está online!`);
  carregarDados();
});

// ===== Mensagens =====
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const comando = args.shift().toLowerCase();

  // ==== !p - ranking pessoal ====
  if (comando === "p") {
    const userId = message.author.id;
    if (!ranking[userId]) ranking[userId] = { vitorias: 0, derrotas: 0, streak: 0, xp: 0 };
    if (!coins[userId]) coins[userId] = 0;
    const r = ranking[userId];

    const embed = new EmbedBuilder()
      .setTitle(`${message.author.username} - Seu Ranking`)
      .setColor("#00FF00")
      .setDescription(
        `🏆 Vitórias: ${r.vitorias}\n` +
        `💀 Derrotas: ${r.derrotas}\n` +
        `🔥 Vitórias seguidas: ${r.streak}\n` +
        `⭐ XP: ${r.xp}\n` +
        `💰 Coins: ${coins[userId]}`
      );

    message.channel.send({ embeds: [embed] });
  }

  // ==== !rank - Top 10 do servidor ====
  if (comando === "rank") {
    const guild = message.guild;
    if (!guild) return;

    const top10 = Object.entries(ranking)
      .sort(([, a], [, b]) => b.xp - a.xp || b.vitorias - a.vitorias)
      .slice(0, 10);

    if (top10.length === 0) return message.channel.send("Nenhum jogador registrado ainda!");

    let description = "";
    for (let i = 0; i < top10.length; i++) {
      const [userId, stats] = top10[i];
      const user = await guild.members.fetch(userId).catch(() => null);
      const name = user ? user.user.username : `Desconhecido`;
      const userCoins = coins[userId] || 0;
      description += `**#${i + 1} ${name}** - 🏆 ${stats.vitorias} | 💀 ${stats.derrotas} | 🔥 ${stats.streak} | ⭐ XP: ${stats.xp} | 💰 ${userCoins}\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🏅 Top 10 do Servidor`)
      .setColor("#FFD700")
      .setDescription(description);

    message.channel.send({ embeds: [embed] });
  }

  // ==== !vitoria ====
  if (comando === "vitoria") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ Apenas administradores podem usar este comando!");
    }
    if (!message.mentions.users.size) return message.reply("Marque um usuário para adicionar vitória!");
    const alvo = message.mentions.users.first();
    const { xpGanho, coinsGanhas } = registrarVitoria(alvo.id);
    message.channel.send(`✅ Vitória adicionada a ${alvo.username} (+${xpGanho} XP, +${coinsGanhas} coins)`);
  }

  // ==== !derrota ====
  if (comando === "derrota") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ Apenas administradores podem usar este comando!");
    }
    if (!message.mentions.users.size) return message.reply("Marque um usuário para adicionar derrota!");
    const alvo = message.mentions.users.first();
    registrarDerrota(alvo.id);
    message.channel.send(`❌ Derrota adicionada a ${alvo.username}`);
  }
});

client.login(TOKEN);
