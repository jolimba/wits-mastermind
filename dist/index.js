"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ROLE_ID = process.env.ROLE_ID;
const SERVER_ID = process.env.SERVER_ID;
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMembers
    ]
});
client.once("ready", () => {
    console.log(`Bot logado: ${client.user?.tag}`);
    syncMembersRole();
});
client.on("guildMemberAdd", async (member) => {
    try {
        const role = member.guild.roles.cache.get(ROLE_ID);
        if (!role)
            return;
        await member.roles.add(role);
        console.log(`Role ${role.name} added to ${member.user.tag}`);
    }
    catch (error) {
        console.log(error);
    }
});
client.login(process.env.DISCORD_TOKEN);
const syncMembersRole = async () => {
    const guild = client.guilds.cache.get(SERVER_ID);
    if (!guild)
        return;
    const members = await guild.members.fetch();
    for (const member of members.values()) {
        if (member.user.bot)
            continue;
        if (!member.roles.cache.has(ROLE_ID)) {
            await member.roles.add(ROLE_ID);
        }
    }
    console.log('Done!');
};
