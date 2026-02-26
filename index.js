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
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// ===== FILAS =====
let filas = {
  mobile: [],
  emulador: []
};

// ===== EMBED =====
function painel(tipo, guild) {
  const lista = filas[tipo]
    .map((id, i) => `\`${i + 1}\` • <@${id}>`)
    .join("\n") || "✨ Ninguém na fila";

  return new EmbedBuilder()
    .setTitle(`🔥 TESTE • ${tipo.toUpperCase()}`)
    .setDescription(lista)
    .setColor("#7b2cff")
    .setThumbnail(guild.iconURL())
    .addFields({
      name: "👥 Total",
      value: `${filas[tipo].length}`,
      inline: true
    });
}

// ===== BOTÕES =====
function botoes(tipo) {
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

// ===== LOG =====
async function log(guild, texto) {
  const canal = guild.channels.cache.get(process.env.LOG_CHANNEL);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setDescription(texto)
    .setColor("#ff0055")
    .setTimestamp();

  canal.send({ embeds: [embed] });
}

// ===== SLASH =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "fila") {
    const tipo = interaction.options.getString("tipo");

    await interaction.reply({
      embeds: [painel(tipo, interaction.guild)],
      components: [botoes(tipo)]
    });
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
      log(interaction.guild, `✅ ${user} entrou na fila ${tipo}`);
    }
  }

  if (acao === "sair") {
    filas[tipo] = filas[tipo].filter(id => id !== user.id);
    log(interaction.guild, `❌ ${user} saiu da fila ${tipo}`);
  }

  await interaction.update({
    embeds: [painel(tipo, interaction.guild)],
    components: [botoes(tipo)]
  });
});

// ===== CHAMAR =====
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
  log(msg.guild, `📢 <@${primeiro}> foi chamado (${tipo})`);
});

client.login(process.env.TOKEN);