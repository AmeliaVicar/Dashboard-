import { getEnv } from "@/lib/env";

type TelegramResponse = {
  ok: boolean;
  description?: string;
};

export async function sendTelegramMessage(text: string) {
  const env = getEnv();
  const response = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: env.telegramChatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = (await response.json()) as TelegramResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.description ?? `Telegram API request failed with ${response.status}`);
  }
}
