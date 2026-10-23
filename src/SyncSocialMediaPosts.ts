import dotenv from "dotenv";
import path from "node:path";
import { StoredTokens } from "./interfaces/StoredTokensInterface";
import { readFile } from "node:fs/promises";

const TIKTOK_TOKEN = process.env.TIKTOK_TOKEN!;
const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2"!;
const TOKEN_FILE = "../social-media-refreshable-tokens.json";

export const is_token_expiring = async (): Promise<boolean> => {
    
    const body = new URLSearchParams({
        client_key: "",
        client_secret: "",
        grant_type: "refresh_token",
        refresh_token: ""
    })

    const response: Response = await fetch(
        "url",
        {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body
        }
    )
    return false
}

export const readStoredTokens = async (): Promise<StoredTokens> => {
    try {
        const raw_data: string = await readFile(TOKEN_FILE, "utf8");
        const tokens: StoredTokens = JSON.parse(raw_data) as StoredTokens;
        return tokens
    } catch (error) {
        throw error;
    }
}