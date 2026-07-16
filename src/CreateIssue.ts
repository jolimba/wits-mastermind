import {
    PrivateThreadChannel,
    PublicThreadChannel,
    ChannelType,
    Message
} from "discord.js";
import dotenv from "dotenv";

dotenv.config();

interface Reminder {
    channelId: string;
    userId: string;
    createdAt: number;
    nextReminder: number;
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const REPO = process.env.REPO!;
const PROJECT = process.env.PROJECT!;

export const createGithubIssue = async (thread: PrivateThreadChannel | PublicThreadChannel<boolean>): Promise<string> => {
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