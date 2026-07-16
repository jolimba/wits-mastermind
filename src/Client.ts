import {
    Client,
    GatewayIntentBits,
} from "discord.js";

interface Reminder {
    channelId: string;
    userId: string;
    createdAt: number;
    nextReminder: number;
}

export const client: Client<boolean>= new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});