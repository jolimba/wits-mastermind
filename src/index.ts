import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const ROLE_ID = process.env.ROLE_ID!;
const SERVER_ID = process.env.SERVER_ID!;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.once("ready", () => {
    console.log(`Bot logado: ${client.user?.tag}`);
    syncMembersRole();
});

client.on("guildMemberAdd", async(member) => {
    try {
        const role = member.guild.roles.cache.get(ROLE_ID);

        if (!role) return;

        await member.roles.add(role);

        console.log(`Role ${role.name} added to ${member.user.tag}`)

    } catch (error) {
        console.log(error)
    }
});

client.login(process.env.DISCORD_TOKEN);

const syncMembersRole = async () => {
    const guild = client.guilds.cache.get(SERVER_ID);

    if (!guild) return;

    const members = await guild.members.fetch();

    for (const member of members.values()) {
        if (member.user.bot) continue;

        if (!member.roles.cache.has(ROLE_ID)) {
            await member.roles.add(ROLE_ID);
        }
    }
    console.log('Done!')
};