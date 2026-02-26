const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("fila")
    .setDescription("Criar fila de teste")
    .addStringOption(option =>
      option.setName("tipo")
        .setDescription("Escolha a fila")
        .setRequired(true)
        .addChoices(
          { name: "Mobile", value: "mobile" },
          { name: "Emulador", value: "emulador" }
        )
    )
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

(async () => {
  console.log("⏳ Delay...");
  await delay(3000);

  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands }
  );

  console.log("✅ Slash registrado!");
})();