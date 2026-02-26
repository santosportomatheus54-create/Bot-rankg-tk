const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// ===== FILAS =====
let filas = {
  mobile: [],
  emulador: []
};

// ===== SALVAR MENSAGEM DO PAINEL =====
let paineis = {
  mobile: null,
  emulador: null
};

// ===== CRIAR EMBED =====
function criarPainel(tipo, guild) {
  const lista = filas[tipo]
    .map((id, i) => `\`${i + 1}\` • <@${id}>`)
    .join("\n") || "✨ Ninguém na fila";

  return new EmbedBuilder()
    .setTitle(`🔥 TESTE DE GUILDA • ${tipo.toUpperCase()}`)
    .setDescription(lista)
    .setColor("#6a00ff")
    .setThumbnail(guild.iconURL())
    .addFields({
      name: "👥 Total",
      value: `${filas[tipo].length}`,
      inline: true
    })
    .setFooter({ text: "Clique nos botões para entrar ou sair" });
}

// ===== BOTÕES =====
function criarBotoes(tipo) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`entrar_${tipo}`)
      .setLabel("Entrar")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`sair_${tipo}`)
      .setLabel("Sair")
      .setStyle(ButtonStyle.Danger)
  );
}

// ===== ATUALIZAR PAINEL =====
async function atualizarPainel(tipo, guild) {
  if (!paineis[tipo]) return;

  try {
    const canal = guild.channels.cache.get(paineis[tipo].canalId);
    const msg = await canal.messages.fetch(paineis[tipo].mensagemId);

    await msg.edit({
      embeds: [criarPainel(tipo, guild)],
      components: [criarBotoes(tipo)]
    });

  } catch (err) {
    console.log("Erro ao atualizar painel");
  }
}

// ===== LOG =====
async function enviarLog(guild, texto) {
  const canal = guild.channels.cache.get(process.env.LOG_CHANNEL);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setDescription(texto)
    .setColor("#ff0044")
    .setTimestamp();

  canal.send({ embeds: [embed] });
}

// ===== SLASH =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "fila") {
    const tipo = interaction.options.getString("tipo");

    const resposta = await interaction.reply({
      embeds: [criarPainel(tipo, interaction.guild)],
      components: [criarBotoes(tipo)],
      fetchReply: true
    });

    paineis[tipo] = {
      mensagemId: resposta.id,
      canalId: resposta.channel.id
    };
  }
});

// ===== BOTÕES =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const [acao, tipo] = interaction.customId.split("_");
  const user = interaction.user;

  if (acao === "entrar") {
    if (!filas[tipo].includes(user.id)) {
      filas[tipo].push(user.id);
      enviarLog(interaction.guild, `✅ ${user} entrou na fila **${tipo}**`);
    }
  }

  if (acao === "sair") {
    filas[tipo] = filas[tipo].filter(id => id !== user.id);
    enviarLog(interaction.guild, `❌ ${user} saiu da fila **${tipo}**`);
  }

  await interaction.deferUpdate();
  atualizarPainel(tipo, interaction.guild);
});

// ===== !CHAMAR =====
client.on("messageCreate", async msg => {
  if (!msg.content.startsWith("!chamar")) return;

  if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return msg.reply("❌ Apenas ADM.");

  const tipo = msg.content.split(" ")[1];

  if (!filas[tipo] || filas[tipo].length === 0)
    return msg.reply("Fila vazia.");

  const primeiro = filas[tipo].shift();

  const canal = await msg.guild.channels.create({
    name: `teste-${tipo}`,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: msg.guild.roles.everyone, deny: ["ViewChannel"] },
      { id: primeiro, allow: ["ViewChannel"] },
      { id: msg.guild.members.me, allow: ["ViewChannel"] }
    ]
  });

  canal.send(`<@${primeiro}> você foi chamado!`);

  enviarLog(msg.guild, `📢 <@${primeiro}> foi chamado (${tipo})`);

  atualizarPainel(tipo, msg.guild);
});

client.once("ready", () => {
  console.log(`🔥 Bot online: ${client.user.tag}`);
});

client.login(process.env.TOKEN);