import dotenv from "dotenv";


const TIKTOK_TOKEN = process.env.TIKTOK_TOKEN!;
const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2"!;

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