import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

let cachedKey: string | null = null;
let keySource: "secret-manager" | "env" | "not-configured" = "not-configured";

/**
 * Retrieves the Gemini API key dynamically at runtime from Google Cloud Secret Manager.
 * Seamlessly falls back to process.env.GEMINI_API_KEY if Secret Manager is not
 * accessible in local dev / container sandbox, ensuring zero hardcoded credentials.
 */
export async function getGeminiApiKey(): Promise<{ key: string; source: "secret-manager" | "env" }> {
  if (cachedKey) {
    return { key: cachedKey, source: keySource as "secret-manager" | "env" };
  }

  const secretName = process.env.GEMINI_SECRET_NAME || "GEMINI_API_KEY";
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.PROJECT_ID ||
    "personal-gemini-journal-b0379";

  // 1. Attempt dynamic retrieval from Google Cloud Secret Manager
  try {
    const client = new SecretManagerServiceClient();
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload?.data?.toString();

    if (payload && payload.trim().length > 0) {
      console.log(`[SecretManager] Successfully retrieved secret '${secretName}' at runtime.`);
      cachedKey = payload.trim();
      keySource = "secret-manager";
      return { key: cachedKey, source: "secret-manager" };
    }
  } catch (error: any) {
    console.info(
      `[SecretManager] Cloud Secret Manager lookup for '${secretName}' in project '${projectId}' bypassed: ${
        error?.message || error
      }. Falling back to container environment.`
    );
  }

  // 2. Fallback to runtime environment variable (injected by AI Studio or Cloud Run env)
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    console.log("[SecretManager] Ingested GEMINI_API_KEY securely from runtime environment.");
    cachedKey = process.env.GEMINI_API_KEY.trim();
    keySource = "env";
    return { key: cachedKey, source: "env" };
  }

  throw new Error(
    "Gemini API key is not configured. Please add GEMINI_API_KEY to Google Cloud Secret Manager or configure the environment variable."
  );
}

export function getSecretStatus(): { configured: boolean; source: string } {
  return {
    configured: !!(cachedKey || process.env.GEMINI_API_KEY),
    source: keySource,
  };
}
