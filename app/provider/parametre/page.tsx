"use client";
export const dynamic = "force-dynamic";

import SettingsPageShared from "../../components/SettingsPageShared";
import { useNotifications } from "../../../hooks/provider/useNotifications";

export default function ProviderParametrePage() {
  const { unreadCount } = useNotifications();
  return <SettingsPageShared unreadCount={unreadCount} />;
}
