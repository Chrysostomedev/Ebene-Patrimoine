"use client";
export const dynamic = "force-dynamic";

import SettingsPageShared from "../../components/SettingsPageShared";
import { useNotifications } from "../../../hooks/admin/useNotifications";

export default function AdminParametresPage() {
  const { unreadCount } = useNotifications();
  return <SettingsPageShared unreadCount={unreadCount} />;
}
