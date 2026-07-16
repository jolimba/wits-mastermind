import {
    Collection,
    GuildMember,
} from "discord.js";
import dotenv from "dotenv";
import { client } from "./Client"

dotenv.config();

const ROLE_ID = process.env.ROLE_ID!;
const SERVER_ID = process.env.SERVER_ID!;

export const syncMembersRole = async (): Promise<void> => {
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