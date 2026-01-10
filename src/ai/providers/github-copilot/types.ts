import { z } from 'zod';

export const DeviceCodeResponseSchema = z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_uri: z.string(),
  expires_in: z.number(),
  interval: z.number(),
});

export type DeviceCodeResponse = z.infer<typeof DeviceCodeResponseSchema>;

export const OAuthTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  scope: z.string(),
});

export type OAuthTokenResponse = z.infer<typeof OAuthTokenResponseSchema>;

export const OAuthErrorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
  error_uri: z.string().optional(),
  interval: z.number().optional(),
});

export type OAuthError = z.infer<typeof OAuthErrorSchema>;

export const CopilotTokenResponseSchema = z.object({
  token: z.string(),
  expires_at: z.number(),
});

export type CopilotTokenResponse = z.infer<typeof CopilotTokenResponseSchema>;

export const DeviceCodeRequestSchema = z.object({
  enterprise_url: z.string().optional(),
});

export type DeviceCodeRequest = z.infer<typeof DeviceCodeRequestSchema>;

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}
