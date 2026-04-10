const requiredEnvKeys = [
  "RETAILCRM_BASE_URL",
  "RETAILCRM_API_KEY",
  "RETAILCRM_SITE_CODE",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

export type AppEnv = {
  appBaseUrl: string;
  appTimezone: string;
  retailCrmBaseUrl: string;
  retailCrmApiKey: string;
  retailCrmSiteCode: string;
  retailCrmWebhookSecret: string | null;
  retailCrmDefaultOrderType: string | null;
  retailCrmDefaultOrderMethod: string | null;
  retailCrmDefaultStatus: string | null;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  telegramBotToken: string;
  telegramChatId: string;
  telegramThresholdKzt: number;
  cronSecret: string | null;
  backfillLookbackHours: number;
  mockOrdersPath: string;
};

let cachedEnv: AppEnv | null = null;

function getRequiredEnvValue(key: (typeof requiredEnvKeys)[number]): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required env variable: ${key}`);
  }

  return value;
}

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  for (const key of requiredEnvKeys) {
    getRequiredEnvValue(key);
  }

  cachedEnv = {
    appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
    appTimezone: process.env.APP_TIMEZONE ?? "Asia/Almaty",
    retailCrmBaseUrl: getRequiredEnvValue("RETAILCRM_BASE_URL").replace(/\/$/, ""),
    retailCrmApiKey: getRequiredEnvValue("RETAILCRM_API_KEY"),
    retailCrmSiteCode: getRequiredEnvValue("RETAILCRM_SITE_CODE"),
    retailCrmWebhookSecret: process.env.RETAILCRM_WEBHOOK_SECRET ?? null,
    retailCrmDefaultOrderType: process.env.RETAILCRM_DEFAULT_ORDER_TYPE ?? null,
    retailCrmDefaultOrderMethod: process.env.RETAILCRM_DEFAULT_ORDER_METHOD ?? null,
    retailCrmDefaultStatus: process.env.RETAILCRM_DEFAULT_STATUS ?? null,
    supabaseUrl: getRequiredEnvValue("SUPABASE_URL"),
    supabaseServiceRoleKey: getRequiredEnvValue("SUPABASE_SERVICE_ROLE_KEY"),
    telegramBotToken: getRequiredEnvValue("TELEGRAM_BOT_TOKEN"),
    telegramChatId: getRequiredEnvValue("TELEGRAM_CHAT_ID"),
    telegramThresholdKzt: Number(process.env.TELEGRAM_THRESHOLD_KZT ?? 50000),
    cronSecret: process.env.CRON_SECRET ?? null,
    backfillLookbackHours: Number(process.env.BACKFILL_LOOKBACK_HOURS ?? 48),
    mockOrdersPath: process.env.MOCK_ORDERS_PATH ?? "./data/mock_orders.json",
  };

  return cachedEnv;
}
