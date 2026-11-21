import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, View } from "react-native";

import { errorMessage } from "@/api/errors";
import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageList } from "@/components/ui/language-picker";
import { Avatar, ListRow } from "@/components/ui/list-row";
import { deleteAccount, logout, useSession } from "@/features/auth/session";
import { unsentCount } from "@/features/sync/sync-engine";
import { useLanguage } from "@/localization/i18n";
import { LANGUAGE_NAMES } from "@/localization/languages";
import { colors, space } from "@/theme/tokens";

/**
 * Who is logged in, language and log out (screens 32, 50, 71, 74). Shared by
 * every role.
 */
export function ProfileSection() {
  const { t } = useTranslation();
  const language = useLanguage();
  const profile = useSession((s) => s.profile);
  const out = useMutation({ mutationFn: logout });
  const remove = useMutation({ mutationFn: deleteAccount });
  const [languageOpen, setLanguageOpen] = useState(false);

  const onLogout = async () => {
    // Logging out deletes the phone's database, so warn about work not yet sent.
    const count = await unsentCount();
    Alert.alert(
      t("profile.logoutTitle"),
      count === 0
        ? t("uiField.logoutBody")
        : t("profile.logoutUnsent", { count }),
      [
        {
          text: count === 0 ? t("uiField.stay") : t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("profile.logoutConfirm"),
          style: "destructive",
          onPress: () => out.mutate(),
        },
      ],
    );
  };

  const role = profile?.membership?.role;
  const onDelete = () =>
    Alert.alert(
      t("profile.deleteTitle"),
      role === "OWNER" ? t("profile.deleteBodyOwner") : t("profile.deleteBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.deleteConfirm"),
          style: "destructive",
          onPress: () => remove.mutate(),
        },
      ],
    );
  const phone =
    profile?.user.phone?.replace(/^\+91/, "+91 ") ?? profile?.user.email ?? "";
  const name = profile?.user.name ?? phone;
  const sub = [
    role ? t(`roles.${role}`) : null,
    profile?.user.name ? phone : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.wrap}>
      <Card style={styles.who}>
        <Avatar name={name || "?"} size={56} />
        <View style={styles.flex}>
          <AppText variant="section">{name}</AppText>
          {sub ? (
            <AppText variant="support" color={colors.slate}>
              {sub}
            </AppText>
          ) : null}
        </View>
      </Card>

      <Card style={styles.rows}>
        <ListRow
          icon="translate"
          title={t("language.label")}
          right={
            <AppText color={colors.slate} style={styles.value}>
              {LANGUAGE_NAMES[language]}
            </AppText>
          }
          onPress={() => setLanguageOpen(true)}
        />
      </Card>

      <Button
        variant="destructive"
        icon="logout"
        label={t("profile.logout")}
        onPress={onLogout}
        loading={out.isPending}
      />
      <Button
        variant="text"
        label={t("profile.deleteAccount")}
        onPress={onDelete}
        loading={remove.isPending}
        testID="delete-account"
      />
      {remove.error ? (
        <AppText color={colors.bad} accessibilityLiveRegion="polite">
          {errorMessage(t, remove.error)}
        </AppText>
      ) : null}
      <AppText variant="small" color={colors.muted} style={styles.center}>
        {t("common.appName")}
      </AppText>

      {/* Mounted only while open: other screens (and tests) need no safe-area provider for it. */}
      {languageOpen ? (
        <BottomSheet
          visible
          onClose={() => setLanguageOpen(false)}
          title={t("language.label")}
          subtitle={t("uiField.languageHint")}
        >
          <LanguageList onPicked={() => setLanguageOpen(false)} />
        </BottomSheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  flex: { flex: 1 },
  center: { textAlign: "center" },
  who: { flexDirection: "row", alignItems: "center", gap: space.lg },
  rows: { paddingVertical: space.xs },
  value: { paddingRight: space.xs },
});
