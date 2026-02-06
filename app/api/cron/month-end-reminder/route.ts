import { NextResponse } from "next/server";
import { isLastBusinessDayOfMonth } from "@/lib/date-utils";
import { getRegisteredUsers } from "@/lib/redis";

const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;

async function getAppToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Failed to get app token");
  }
  return data.access_token;
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if today is the last business day of the month
  if (!isLastBusinessDayOfMonth(new Date())) {
    return NextResponse.json({ message: "Kein letzter Werktag" });
  }

  try {
    const appToken = await getAppToken();
    const users = await getRegisteredUsers();

    if (users.length === 0) {
      return NextResponse.json({ message: "Keine registrierten Benutzer" });
    }

    const results: { azureId: string; email: string; success: boolean; error?: string }[] = [];

    for (const user of users) {
      try {
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/users/${user.azureId}/teamwork/sendActivityNotification`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${appToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              topic: {
                source: "text",
                value: "Monatsabschluss",
                webUrl: "https://zep.contiva.dev/dashboard",
              },
              activityType: "monthEndReminder",
              previewText: {
                content: "Bitte alle Zeiten bis Tagesende buchen und freigeben",
              },
              templateParameters: [
                {
                  name: "message",
                  value: "Letzter Werktag — Bitte alle Zeiten für diesen Monat bis Tagesende buchen und freigeben!",
                },
              ],
            }),
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          console.error(`[Cron] Notification failed for ${user.email}:`, errText);
          results.push({ azureId: user.azureId, email: user.email, success: false, error: errText });
        } else {
          console.log(`[Cron] Notification sent to ${user.email}`);
          results.push({ azureId: user.azureId, email: user.email, success: true });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Cron] Error notifying ${user.email}:`, message);
        results.push({ azureId: user.azureId, email: user.email, success: false, error: message });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Monatsende-Erinnerung: ${sent} gesendet, ${failed} fehlgeschlagen`,
      total: users.length,
      sent,
      failed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Cron] Month-end reminder failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
