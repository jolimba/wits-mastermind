import {
    Client,
    GatewayIntentBits,
} from "discord.js";

export const client: Client<boolean>= new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});