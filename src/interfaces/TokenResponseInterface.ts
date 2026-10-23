export interface TokenResponse {
    access_token?: string;
    refresh_tokens?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
}