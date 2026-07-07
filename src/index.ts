import {
    Client,
    Collection,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    PrivateThreadChannel,
    PublicThreadChannel,
    TextBasedChannel,
    ChannelType,
    Events,
    GuildBasedChannel,
    GuildMember,
    Role,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    Message
} from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const ROLE_ID = process.env.ROLE_ID!;
const SERVER_ID = process.env.SERVER_ID!;
const GENERAL_NOTIFICATION_CHANNEL_ID = process.env.GENERAL_NOTIFICATION_CHANNEL_ID!;
const CLIENT_ID = process.env.CLIENT_ID!; //bot id
const TOKEN = process.env.DISCORD_TOKEN!;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]= [
    new SlashCommandBuilder()
        .setName("create_issue")
        .setDescription("Create an Github issue based on a forum's post.")
        .toJSON(),
];

const client: Client<boolean>= new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

client.once("ready", async () => {
    console.log(`Bot logged in: ${client.user?.tag}`);
    await registerCommands();
    await syncMembersRole();
});

client.on("guildMemberAdd", async(member) => {
    try {
        const role: Role | undefined = member.guild.roles.cache.get(ROLE_ID);
        if (!role) return;
        await member.roles.add(role);
        const channel: GuildBasedChannel | undefined = member.guild.channels.cache.get(GENERAL_NOTIFICATION_CHANNEL_ID);
        if (channel?.isTextBased()) {
            await channel.send(`Welcome to the WitS server, ${member}`);
        }
    } catch (error) {
        console.log(error)
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "create_issue") return;
    try {
        if (!interaction.channel?.isThread()) {
            return interaction.reply({
                content: "This command can only be used inside a forum thread.",
                ephemeral: true
            });
        }
        const thread = interaction.channel;
        const parent = thread.parent;
        if (!parent || parent.type !== ChannelType.GuildForum) {
            return interaction.reply({
                content: "This command can only be used inside a forum post.",
                ephemeral: true
            });
        }
        await createGithubIssue(thread);
        await interaction.reply({
            content: "GitHub issue created successfully!",
            ephemeral: true
        });
    } catch (error) {
        console.error(error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "Failed to create the GitHub issue.",
                ephemeral: true
            });
        }
    }
});

client.login(TOKEN);

async function syncMembersRole(): Promise<void> {
    const guild = client.guilds.cache.get(SERVER_ID);

    if (!guild) return;

    const members: Collection<string, GuildMember> = await guild.members.fetch();

    for (const member of members.values()) {
        if (member.user.bot) continue;

        if (!member.roles.cache.has(ROLE_ID)) {
            await member.roles.add(ROLE_ID);
        }
    }
    console.log('Done!')
};

async function registerCommands(): Promise<void> {
    const rest = new REST({ version: "10"}).setToken(TOKEN);
    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, SERVER_ID),
            {body: commands}
        );
    } catch (error) {
        console.error(error);
    }
};

async function createGithubIssue(thread: PrivateThreadChannel | PublicThreadChannel<boolean>): Promise<void> {
    let title: string = thread.name;
    const starterMessage: Message<true> | null = await thread.fetchStarterMessage();
    const parent = thread.parent;
    if (!parent || parent.type !== ChannelType.GuildForum) {
        throw new Error("Thread is not inside a forum.");
    }
    const labels: string[] = thread.appliedTags
        .map(id => parent.availableTags.find(tag => tag.id === id)?.name)
        .filter((name): name is string => name !== undefined);

    const content = starterMessage?.content ?? "";
    const attachments = starterMessage?.attachments
        .map(attachment => `![](${attachment.url})`)
        .join("\n") ?? "";

    const body = [content, attachments]
        .filter(part => part.length > 0)
        .join("\n\n");
    title = "[" + labels + "] " + title
    const response: Response = await fetch(
        "https://api.github.com/repos/satoshimatos/project_anubis/issues",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title,
                body,
                labels
            })
        }
    );
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }
}