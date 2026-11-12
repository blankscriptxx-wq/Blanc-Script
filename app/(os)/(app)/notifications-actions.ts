"use server";

import { getNeedsYou, type NeedsYouItem } from "@/lib/data/today-feed";

export type NotificationItem = Pick<NeedsYouItem, "id" | "kind" | "title" | "meta" | "href" | "tone">;

/** What needs attention right now, for the bell in the top bar. */
export async function getNotificationsAction(): Promise<NotificationItem[]> {
  try {
    const { items } = await getNeedsYou();
    return items.map(({ id, kind, title, meta, href, tone }) => ({ id, kind, title, meta, href, tone }));
  } catch {
    return [];
  }
}
