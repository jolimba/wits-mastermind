import dotenv from "dotenv";
import { promises as fs } from "fs";
import { client } from "./Client"

dotenv.config();

interface Reminder {
    channelId: string;
    userId: string;
    createdAt: number;
    nextReminder: number;
}

const REMINDER_CHANNEL_ID = process.env.REMINDER_CHANNEL_ID!;
const SATOSHI_ID = process.env.SATOSHI_ID!;
const GENERAL_REMINDER_CHANNEL_ID = process.env.GENERAL_REMINDER_CHANNEL_ID!;

const REMINDERS_FILE = "./data/reminders.json";

export const ensureReminderFile = async(): Promise<void> => {
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

export const loadReminders = async(): Promise<Reminder[]> => {
    await ensureReminderFile();
    const data = await fs.readFile(REMINDERS_FILE, "utf8");
    return JSON.parse(data);
}

export const saveReminders = async (reminders: Reminder[]): Promise<void> => {
    await fs.writeFile(
        REMINDERS_FILE,
        JSON.stringify(reminders, null, 4)
    );
}

export const addReminder = async (channelId: string, userId: string): Promise<boolean> => {
    const reminders = await loadReminders();
    const now = Date.now();
    if (reminders.some(r =>
        r.channelId === channelId &&
        r.userId === userId
    )) {
        return false;
    }
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

export const removeReminder = async (channelId: string, userId: string): Promise<boolean> => {
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

export const checkReminders = async (): Promise<void> => {
    const now = Date.now();
    console.log("Checking...", now);
    const reminders = await loadReminders();
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
            const channelId = reminder.userId === SATOSHI_ID
                ? REMINDER_CHANNEL_ID
                : GENERAL_REMINDER_CHANNEL_ID   
            
            const reminderChannel = await client.channels.fetch(channelId);

            if (!reminderChannel?.isSendable()) {
                console.error(`Reminder channel ${channelId} not found.`);
                continue;
            }

            await reminderChannel.send(
                `<@${reminder.userId}> Don't forget to check <#${reminder.channelId}>. If you don't need this remind anymore, please use /stop.`
            );
            reminder.nextReminder = now + 12 * 60 * 60 * 1000;
            changed = true;
        }
        if (changed) {
            await saveReminders(reminders);
        }
    } catch (err) {
        console.error("Reminder error:", err);
    }
}