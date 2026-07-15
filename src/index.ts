import {
    Client,
    Collection,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    PrivateThreadChannel,
    PublicThreadChannel,
    ChannelType,
    GuildBasedChannel,
    GuildMember,
    Role,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    Message
} from "discord.js";
import dotenv from "dotenv";
import { promises as fs } from "fs";

dotenv.config();

interface Reminder {
    channelId: string;
    userId: string;
    createdAt: number;
    nextReminder: number;
}

const ROLE_ID = process.env.ROLE_ID!;
const SERVER_ID = process.env.SERVER_ID!;
const GENERAL_NOTIFICATION_CHANNEL_ID = process.env.GENERAL_NOTIFICATION_CHANNEL_ID!;
const CLIENT_ID = process.env.CLIENT_ID!; //bot id
const TOKEN = process.env.DISCORD_TOKEN!;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const REPO = process.env.REPO!;
const PROJECT = process.env.PROJECT!;
const REMINDER_CHANNEL_ID = process.env.REMINDER_CHANNEL_ID!;

const REMINDERS_FILE = "./data/reminders.json";

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]= [
    new SlashCommandBuilder()
        .setName("create_issue")
        .setDescription("Create an Github issue based on a forum's post.")
        .toJSON(),
    new SlashCommandBuilder()
        .setName("remindme")
        .setDescription("Set a reminder. In 24h Mastermind will tag you in some channel.")
        .toJSON(),
    new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop the reminder.")
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
    await ensureReminderFile();
    console.log(`Bot logged in: ${client.user?.tag}`);
    await registerCommands();
    await syncMembersRole();
    await checkReminders();
    setInterval(async () => {
        await checkReminders();
    }, 1000);
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
    if (!interaction.channel) {
        return interaction.reply({
            content: "Could not determine the channel.",
            ephemeral: true
        });
    }
    switch (interaction.commandName) {
        case "create_issue":
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
                const url: string = await createGithubIssue(thread);
                await interaction.reply({
                    content: "GitHub issue created successfully! Url: " + url,
                    ephemeral: false
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
            break;
        case "remindme":
            const success = await addReminder(
                interaction.channel.id,
                interaction.user.id
            );
            await interaction.reply({
                content: success
                    ? "Reminder created successfully."
                    : "You already have a reminder in this channel.",
                ephemeral: true
            });
            break;
        case "stop":
            const remove = await removeReminder(
                interaction.channel.id,
                interaction.user.id
            );
            await interaction.reply({
                content: remove
                    ? "Reminder removed."
                    : "There is no reminder for you in this channel.",
                ephemeral: true
            });
            break;
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

async function createGithubIssue(thread: PrivateThreadChannel | PublicThreadChannel<boolean>): Promise<string> {
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
        "https://api.github.com/repos/" + REPO + "/" + PROJECT +"/issues",
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
    const issue = await response.json();
    return issue.html_url;
}

async function ensureReminderFile(): Promise<void> {
    try {
        await fs.mkdir("./data", { recursive: true });

        await fs.access(REMINDERS_FILE);
    } catch {
        await fs.writeFile(
            REMINDERS_FILE,
            JSON.stringify([], null, 4),
            "utf8"
        );
    }
}

async function loadReminders(): Promise<Reminder[]> {
    await ensureReminderFile();
    const data = await fs.readFile(REMINDERS_FILE, "utf8");
    return JSON.parse(data);
}

async function saveReminders(reminders: Reminder[]): Promise<void> {
    await fs.writeFile(
        REMINDERS_FILE,
        JSON.stringify(reminders, null, 4)
    );
}

async function addReminder(channelId: string, userId: string): Promise<boolean> {
    const reminders = await loadReminders();
    if (reminders.some(r =>
        r.channelId === channelId &&
        r.userId === userId
    )) {
        return false;
    }
    const now = Date.now();
    reminders.push({
        channelId,
        userId,
        createdAt: now,
        nextReminder: now + 12 * 60 * 60 * 1000
        // nextReminder: now + 10 * 1000
    });
    await saveReminders(reminders);
    return true;
}

async function removeReminder(channelId: string, userId: string): Promise<boolean> {
    const reminders = await loadReminders();
    const filtered = reminders.filter(r =>
        !(r.channelId === channelId &&
          r.userId === userId)
    );
    if (filtered.length === reminders.length) {
        return false;
    }
    await saveReminders(filtered);
    return true;
}

async function checkReminders(): Promise<void> {
    console.log("Checking...", Date.now());
    const reminders = await loadReminders();
    const now = Date.now();
    let changed = false;
    try {
        const reminderChannel = await client.channels.fetch(REMINDER_CHANNEL_ID);
        if (!reminderChannel?.isSendable()) {
            console.error("Reminder channel not found or not sendable.");
            return;
        }
        for (const reminder of reminders) {
            if (reminder.nextReminder > now) {
                continue;
            }
            await reminderChannel.send(
                `<@${reminder.userId}> Don't forget to check <#${reminder.channelId}>`
            );
            reminder.nextReminder = Date.now() + 12 * 60 * 60 * 1000;
            changed = true;
        }
        if (changed) {
            await saveReminders(reminders);
        }
    } catch (err) {
        console.error("Reminder error:", err);
    }
}