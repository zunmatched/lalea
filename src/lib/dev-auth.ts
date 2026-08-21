import { getServerEnv } from "./env";
export function requireUserId() {
  const env = getServerEnv();
  if (env.DEV_AUTH_ENABLED !== "true" || !env.DEV_AUTH_USER_ID) throw new Error("Authentication is not configured");
  return env.DEV_AUTH_USER_ID;
}

