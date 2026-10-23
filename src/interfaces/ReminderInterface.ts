export interface Reminder {
    channelId: string;
    userId: string;
    createdAt: number;
    nextReminder: number;
}