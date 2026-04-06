import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

const TOKEN = process.env["DISCORD_BOT_TOKEN"];
if (!TOKEN) {
  console.error("DISCORD_BOT_TOKEN environment variable is required.");
  process.exit(1);
}

const CLIENT_ID = "1490468694252322906";
const ALLOWED_USER_ID = "1030955815114391592";
const SUPPORT_ROLE_ID = "1447580039406424225";
const OWNER_ID = "1490468694252322906";

const EMBED_COLOR = 0x7b2fbe;
const FOOTER_TEXT = "🔥 𝙎𝙣𝙞𝙥𝙚𝙭ᴸᵘᵃ ᶜᵒᵐᵐᵘⁿⁱᵗʸ 👻";
const FOOTER_ICON =
  "https://cdn.discordapp.com/attachments/1381714599442649138/1490162386122965042/file_000000008870720e9825f146362ee8a53.png";

const ticketsByUser = new Map();
const ticketStore = new Map();

function buildEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(title)
    .setDescription(description)
    .setImage(FOOTER_ICON)
    .setFooter({ text: FOOTER_TEXT, iconURL: FOOTER_ICON });
}

function buildTicketButtons(attendDisabled = false) {
  const closeBtn = new ButtonBuilder()
    .setCustomId("close_ticket")
    .setLabel("🔒 Fechar Ticket")
    .setStyle(ButtonStyle.Danger);

  const attendBtn = new ButtonBuilder()
    .setCustomId("attend_ticket")
    .setLabel("✅ Atender")
    .setStyle(ButtonStyle.Success)
    .setDisabled(attendDisabled);

  const notifyBtn = new ButtonBuilder()
    .setCustomId("notify_attendant")
    .setLabel("🔔 Notificar Atendente")
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(closeBtn, attendBtn, notifyBtn);
}

function buildWelcomeEmbed(attendantId) {
  const status = attendantId
    ? `⏳ Status: Atendido por <@${attendantId}>`
    : "⏳ Status: Aguardando atendimento da equipe...";

  return buildEmbed(
    "🎫 Ticket Aberto",
    `Seu ticket foi criado com sucesso!\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `**1 - Aguarde o Atendimento**\n` +
      `> - Um membro da equipe irá responder em breve.\n` +
      `> - Permaneça neste canal enquanto aguarda.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `**2 - Durante a Espera**\n` +
      `> - Explique seu problema com clareza.\n` +
      `> - Evite enviar várias mensagens seguidas.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `**3 - Encerramento do Ticket**\n` +
      `> - Caso seu problema seja resolvido, utilize o botão 🔒 Fechar Ticket.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      status
  );
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

async function registerCommands() {
  const command = new SlashCommandBuilder()
    .setName("setup_de_suporte")
    .setDescription("Configura o painel de suporte no canal atual.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const rest = new REST().setToken(TOKEN);

  try {
    console.log("Registering slash commands globally...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: [command.toJSON()],
    });
    console.log("Slash commands registered successfully.");
  } catch (error) {
    console.error("Error registering slash commands:", error);
  }
}

client.once("clientReady", async () => {
  console.log(`✅ Bot online as ${client.user?.tag}`);
  await registerCommands();
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== "setup_de_suporte") return;

    if (interaction.user.id !== ALLOWED_USER_ID) {
      await interaction.reply({
        content: "❌ Você não tem permissão para usar este comando.",
        ephemeral: true,
      });
      return;
    }

    const panelEmbed = buildEmbed(
      "🛠️ Central de Suporte — SnipexLua Community",
      `Precisa de ajuda? Abra um ticket selecionando o tipo de suporte desejado abaixo.\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `**1 - Suporte Geral**\n` +
        `> - Dúvidas sobre o servidor\n` +
        `> - Problemas com compras ou vendas\n` +
        `> - Ajuda com regras, cargos ou sistema\n` +
        `> - Reportar erros ou membros\n\n` +
        `👉 Ideal para qualquer ajuda dentro do servidor.\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `**2 - Suporte Scripts**\n` +
        `> - Problemas com scripts adquiridos\n` +
        `> - Dúvidas de funcionamento\n` +
        `> - Erros durante execução\n` +
        `> - Auxílio técnico relacionado aos scripts\n\n` +
        `👉 Use esta opção apenas para assuntos envolvendo scripts.\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `**3 - Avisos Importantes**\n` +
        `> - Abra apenas um ticket por vez.\n` +
        `> - Explique seu problema com clareza.\n` +
        `> - Evite spam ou mensagens repetidas.\n\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `🎫 Selecione uma opção abaixo para abrir seu suporte.`
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("ticket_select")
      .setPlaceholder("Selecione o tipo de suporte...")
      .addOptions([
        {
          label: "Suporte",
          description: "Contate o suporte do servidor para problemas gerais.",
          value: "suporte_geral",
          emoji: "🎫",
        },
        {
          label: "Suporte Scripts",
          description:
            "Contate o suporte de Scripts para resolver problemas com Scripts pagos.",
          value: "suporte_scripts",
          emoji: "📜",
        },
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({ content: "✅ Painel de suporte enviado!", ephemeral: true });
    await interaction.channel?.send({ embeds: [panelEmbed], components: [row] });
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
    await handleTicketCreation(interaction);
    return;
  }

  if (interaction.isButton()) {
    const { customId } = interaction;
    if (customId === "close_ticket") {
      await handleCloseTicket(interaction);
    } else if (customId === "attend_ticket") {
      await handleAttendTicket(interaction);
    } else if (customId === "notify_attendant") {
      await handleNotifyAttendant(interaction);
    }
    return;
  }
});

async function handleTicketCreation(interaction) {
  const { guild } = interaction;
  if (!guild) return;

  const userId = interaction.user.id;

  if (ticketsByUser.has(userId)) {
    const existingChannelId = ticketsByUser.get(userId);
    const existingChannel = guild.channels.cache.get(existingChannelId);
    if (existingChannel) {
      await interaction.reply({
        content: `❌ Você já possui um ticket aberto: <#${existingChannelId}>. Por favor, feche-o antes de abrir um novo.`,
        ephemeral: true,
      });
      return;
    }
    ticketsByUser.delete(userId);
    ticketStore.delete(existingChannelId);
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const safeUsername =
      interaction.user.username
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 20) || interaction.user.id.slice(-6);

    const selectedValue = interaction.values[0];
    const prefix = selectedValue === "suporte_scripts" ? "scripts" : "suporte";
    const channelName = `${prefix}-${safeUsername}`;
    const supportRole = guild.roles.cache.get(SUPPORT_ROLE_ID);

    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: userId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
        ],
      },
      {
        id: OWNER_ID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ];

    if (supportRole) {
      permissionOverwrites.push({
        id: supportRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites,
    });

    const welcomeMsg = await ticketChannel.send({
      content: `<@${userId}>`,
      embeds: [buildWelcomeEmbed()],
      components: [buildTicketButtons()],
    });

    ticketsByUser.set(userId, ticketChannel.id);
    ticketStore.set(ticketChannel.id, {
      channelId: ticketChannel.id,
      userId,
      messageId: welcomeMsg.id,
    });

    await interaction.editReply({
      content: `✅ Seu ticket foi criado com sucesso! <#${ticketChannel.id}>`,
    });
  } catch (err) {
    console.error("Error creating ticket:", err);
    await interaction.editReply({
      content:
        "❌ Ocorreu um erro ao criar o ticket. Verifique as permissões do bot e tente novamente.",
    });
  }
}

async function handleCloseTicket(interaction) {
  const channelId = interaction.channelId;
  const data = ticketStore.get(channelId);

  await interaction.reply({
    embeds: [
      buildEmbed(
        "🔒 Ticket Encerrado",
        `Este ticket foi encerrado por <@${interaction.user.id}>.\n\nO canal será deletado em **5 segundos**.`
      ),
    ],
  });

  if (data) {
    ticketsByUser.delete(data.userId);
    ticketStore.delete(channelId);
  }

  setTimeout(async () => {
    try {
      await interaction.channel?.delete();
    } catch (err) {
      console.error("Error deleting ticket channel:", err);
    }
  }, 5000);
}

async function handleAttendTicket(interaction) {
  const member = interaction.member;
  const channelId = interaction.channelId;

  if (!member.roles.cache.has(SUPPORT_ROLE_ID)) {
    await interaction.reply({
      content: "❌ Apenas membros com o cargo de suporte podem clicar em Atender.",
      ephemeral: true,
    });
    return;
  }

  const data = ticketStore.get(channelId);
  if (!data) {
    await interaction.reply({
      content: "❌ Dados do ticket não encontrados.",
      ephemeral: true,
    });
    return;
  }

  if (data.attendantId) {
    await interaction.reply({
      content: `❌ Este ticket já está sendo atendido por <@${data.attendantId}>.`,
      ephemeral: true,
    });
    return;
  }

  data.attendantId = interaction.user.id;
  ticketStore.set(channelId, data);

  if (data.messageId) {
    try {
      const msg = await interaction.channel.messages.fetch(data.messageId);
      await msg.edit({
        embeds: [buildWelcomeEmbed(interaction.user.id)],
        components: [buildTicketButtons(true)],
      });
    } catch (err) {
      console.error("Error updating ticket embed:", err);
    }
  }

  await interaction.reply({
    content: `✅ <@${interaction.user.id}> está agora atendendo este ticket.`,
  });
}

async function handleNotifyAttendant(interaction) {
  const channelId = interaction.channelId;
  const data = ticketStore.get(channelId);

  if (!data) {
    await interaction.reply({
      content: "❌ Dados do ticket não encontrados.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.user.id !== data.userId) {
    await interaction.reply({
      content: "❌ Apenas o criador do ticket pode notificar o atendente.",
      ephemeral: true,
    });
    return;
  }

  if (!data.attendantId) {
    await interaction.reply({
      content:
        "❌ Nenhum atendente foi designado ainda. Aguarde alguém clicar em ✅ Atender.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: `🔔 <@${data.attendantId}>, o usuário está aguardando atendimento neste ticket.`,
  });
}

client.login(TOKEN);
