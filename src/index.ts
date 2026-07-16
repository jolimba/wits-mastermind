import {
    REST,
    Routes,
    SlashCommandBuilder,
    ChannelType,
    GuildBasedChannel,
    Role,
    GuildMember,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import dotenv from "dotenv";
import { promises as fs } from "fs";
import { syncMembersRole } from "./SyncMembers"
import {
    ensureReminderFile,
    addReminder,
    removeReminder,
    checkReminders
} from "./CreateReminders"
import { createGithubIssue } from "./CreateIssue"
import { client } from "./Client"

dotenv.config();

const ROLE_ID = process.env.ROLE_ID!;
const SERVER_ID = process.env.SERVER_ID!;
const GENERAL_NOTIFICATION_CHANNEL_ID = process.env.GENERAL_NOTIFICATION_CHANNEL_ID!;
const CLIENT_ID = process.env.CLIENT_ID!; //bot id
const TOKEN = process.env.DISCORD_TOKEN!;
const ROLE_TEAM_MEMBER_ID = process.env.ROLE_TEAM_MEMBER_ID!;

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]= [
    new SlashCommandBuilder()
        .setName("create_issue")
        .setDescription("Create an Github issue based on a forum's post.")
        .toJSON(),
    new SlashCommandBuilder()
        .setName("remindme")
        .setDescription("Set a reminder. In 12h Mastermind will tag you in some channel.")
        .toJSON(),
    new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop the reminder.")
        .toJSON(),
];

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
    const member = interaction.member as GuildMember;
    if (!member.roles.cache.has(ROLE_TEAM_MEMBER_ID)) {
        return interaction.reply({
            content: "You don't have permission.",
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
