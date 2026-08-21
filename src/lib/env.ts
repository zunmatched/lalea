import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DEV_AUTH_ENABLED: z.enum(["true", "false"]).default("false"),
  DEV_AUTH_USER_ID: z.string().uuid().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
}).superRefine((value, context) => {
  if (value.NODE_ENV === "production" && value.DEV_AUTH_ENABLED === "true") context.addIssue({ code: "custom", message: "DEV_AUTH_ENABLED cannot be true in production", path: ["DEV_AUTH_ENABLED"] });
  if (value.DEV_AUTH_ENABLED === "true" && !value.DEV_AUTH_USER_ID) context.addIssue({ code: "custom", message: "DEV_AUTH_USER_ID is required", path: ["DEV_AUTH_USER_ID"] });
});
export type ServerEnv = z.infer<typeof schema>;
export function getServerEnv(): ServerEnv { return schema.parse(process.env); }

