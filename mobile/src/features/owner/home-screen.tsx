import { queryOptions, useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { PendingSaves } from '@/features/sync/pending-saves';
import { api, useSession } from '@/features/auth/session';
import { useDayLabel } from '@/features/jobs/jobs';
import { useFeatures } from '@/features/employees/api';
import { useTeams } from '@/features/teams/teams';
import type { FeedItem } from '@/features/updates/api';
import { FeedRow, UpdatesBell } from '@/features/updates/feed';
import { useLanguage } from '@/localization/i18n';
import { colors, radius, space, tones, type Tone } from '@/theme/tokens';

type ActionKind = 'PART_NEEDED' | 'HOLD_OURS' | 'HOLD_CUSTOMER' | 'FOLLOW_UP' | 'NOT_SCHEDULED';
type JobStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

/** `GET /dashboard` (T4.12). Money in paise. */
export type Dashboard = {
  today: string;
  enquiries: { open: number; bySource: Record<string, number>; newest: { id: string; customerName: string } | null };
  needTeam: {
    count: number;
    next: { id: string; jobNumber: number; customerName: string; scheduledDate: string | null; timeSlot: string | null } | null;
  };
  needsAction: {
    count: number;
    items: {
      kind: ActionKind;
      jobId: string;
      jobNumber: number;
      customerName: string;
      teamName: string | null;
      note: string | null;
      at: string;
    }[];
  };
  todayByStatus: { total: number; NEW: number; ASSIGNED: number; IN_PROGRESS: number; ON_HOLD: number; COMPLETED: number };
  latest: { jobId: string; jobNumber: number; customerName: string; toStatus: JobStatus; note: string | null; by: string; at: string }[];
  money: { toCollect: number; cashWithTeams: number; cashCount: number; readyToBill: number };
  /** "Updates from teams" (T4.7): the bell's count and the newest rows of `GET /updates`. */
  updates: { unread: number; latest: FeedItem[] };
};

export const DASHBOARD_KEY = ['dashboard'] as const;
export const useDashboard = () => queryOptions({ queryKey: DASHBOARD_KEY, queryFn: () => api.get<Dashboard>('/dashboard') });

/** Today's jobs grouped as on Stitch screen 02. */
const GROUPS: { key: string; tone: Tone; statuses: (keyof Dashboard['todayByStatus'])[] }[] = [
  { key: 'notStarted', tone: 'teal', statuses: ['NEW', 'ASSIGNED'] },
  { key: 'working', tone: 'warn', statuses: ['IN_PROGRESS'] },
  { key: 'onHold', tone: 'orange', statuses: ['ON_HOLD'] },
  { key: 'done', tone: 'ok', statuses: ['COMPLETED'] },
];

const KIND: Record<ActionKind, { title: string; icon: IconName; tone: Tone }> = {
  PART_NEEDED: { title: 'uiUpdates.kindPart', icon: 'package-variant-closed', tone: 'orange' },
  HOLD_OURS: { title: 'uiHome.kindHoldOurs', icon: 'alert-outline', tone: 'orange' },
  HOLD_CUSTOMER: { title: 'uiHome.kindHoldCustomer', icon: 'pause', tone: 'grey' },
  FOLLOW_UP: { title: 'uiHome.kindFollowUp', icon: 'repeat', tone: 'warn' },
  NOT_SCHEDULED: { title: 'uiHome.kindNotScheduled', icon: 'calendar-blank-outline', tone: 'info' },
};

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;
const openJob = (id: string) => router.push({ pathname: '/jobs/[id]', params: { id } });

/**
 * Owner Home (Stitch 02, T4.12): what needs the owner now, from one
 * `GET /dashboard` call. Pull down to refresh. A new business without teams
 * also sees the "Get started" card (D-027).
 */
export function OwnerHomeScreen() {
  const { t } = useTranslation();
  const language = useLanguage();
  const name = useSession((s) => s.profile?.user.name ?? null);
  const dash = useQuery(useDashboard());
  const features = useFeatures();
  const teams = useQuery({ ...useTeams(), enabled: features.has('TEAMS') });
  const dayLabel = useDayLabel();

  // The tab stays mounted: refresh when the owner comes back to it (not on the first focus).
  const seen = useRef(false);
  const { refetch } = dash;
  useFocusEffect(
    useCallback(() => {
      if (seen.current) void refetch();
      seen.current = true;
    }, [refetch]),
  );

  const hour = new Date().getHours();
  const greeting = t(hour < 12 ? 'uiOwner.goodMorning' : hour < 17 ? 'uiOwner.goodAfternoon' : 'uiOwner.goodEvening');
  const firstName = name?.trim().split(/\s+/)[0];
  const date = new Date().toLocaleDateString(`${language}-IN`, { weekday: 'short', day: 'numeric', month: 'short' });
  const refresh = () => {
    void dash.refetch();
    void teams.refetch();
  };

  const d = dash.data;
  const e = d?.enquiries;
  const sources = e
    ? Object.entries(e.bySource)
        .sort((x, y) => y[1] - x[1])
        .map(([s, count]) => t(`uiHome.src_${s}`, { count }))
        .join(', ')
    : '';
  const more = d ? d.needsAction.count - d.needsAction.items.length : 0;

  return (
    <Screen refreshControl={<RefreshControl refreshing={dash.isRefetching} onRefresh={refresh} />}>
      <PendingSaves />
      <View style={styles.between}>
        <View style={styles.flex}>
          <AppText variant="support" color={colors.slate}>
            {date}
          </AppText>
          <AppText variant="title">{firstName ? `${greeting}, ${firstName}` : greeting}</AppText>
        </View>
        {features.has('STAFF_UPDATES') ? <UpdatesBell unread={d?.updates?.unread ?? 0} /> : null}
      </View>

      {teams.data && teams.data.length === 0 ? (
        <Card tone="warm">
          <AppText variant="section">{t('owner.getStartedTitle')}</AppText>
          <AppText color={colors.slate}>{t('owner.getStartedBody')}</AppText>
          <Button icon="account-plus-outline" label={t('owner.addStaff')} onPress={() => router.push('/employees/new')} />
          <Button variant="text" icon="account-group-outline" label={t('owner.employees')} onPress={() => router.push('/employees')} />
        </Card>
      ) : null}

      {dash.isPending ? <ActivityIndicator color={colors.teal} accessibilityLabel={t('common.loading')} /> : null}
      {dash.isError && !d ? (
        <Card tone="warm">
          <AppText weight="semibold">{t('uiHome.loadError')}</AppText>
          <AppText color={colors.bad}>{errorMessage(t, dash.error)}</AppText>
          <Button variant="text" label={t('common.retry')} onPress={refresh} />
        </Card>
      ) : null}

      {d && e && e.open > 0 ? (
        <Card
          onPress={() => router.navigate({ pathname: '/jobs', params: { show: 'enquiries' } })}
          accessibilityLabel={t('uiEnquiry.openCount', { count: e.open })}
        >
          <View style={styles.between}>
            <View style={styles.flex}>
              <AppText weight="semibold">{t('uiEnquiry.openCount', { count: e.open })}</AppText>
              <AppText variant="small" color={colors.slate} numberOfLines={1}>
                {sources ? t('uiHome.bySource', { list: sources }) : null}
              </AppText>
              {e.newest ? (
                <AppText variant="small" color={colors.slate} numberOfLines={1}>
                  {t('uiEnquiry.newest', { name: e.newest.customerName })}
                </AppText>
              ) : null}
            </View>
            <AppText weight="semibold" color={colors.teal}>
              {t('uiEnquiry.view')}
            </AppText>
          </View>
        </Card>
      ) : null}

      {d?.needTeam.next ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('uiOwner.needTeam', { count: d.needTeam.count })}
          onPress={() => router.navigate({ pathname: '/jobs', params: { show: 'open' } })}
          style={({ pressed }) => [styles.needTeam, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.countBox}>
            <AppText weight="bold" color={colors.white}>
              {d.needTeam.count}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText weight="semibold" color={colors.ink}>
              {t('uiOwner.needTeam', { count: d.needTeam.count })}
            </AppText>
            <AppText variant="small" color={colors.slate} numberOfLines={1}>
              {t('uiOwner.needTeamNext', { name: d.needTeam.next.customerName, day: dayLabel(d.needTeam.next.scheduledDate) })}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => openJob(d.needTeam.next!.id)}
            style={({ pressed }) => [styles.assignBtn, pressed && { opacity: 0.85 }]}
          >
            <AppText variant="support" weight="semibold" color={colors.white}>
              {t('uiOwner.assign')}
            </AppText>
          </Pressable>
        </Pressable>
      ) : null}

      {d ? (
        <Card>
          <View>
            <AppText variant="section">{t('uiHome.needsAction', { count: d.needsAction.count })}</AppText>
            <AppText variant="small" color={colors.slate}>
              {t('uiHome.needsActionSub')}
            </AppText>
          </View>
          {d.needsAction.count === 0 ? (
            <View style={styles.empty}>
              <Icon name="check-all" size={24} color={colors.ok} />
              <AppText weight="semibold">{t('uiHome.allClear')}</AppText>
              <AppText variant="small" color={colors.slate}>
                {t('uiHome.allClearBody')}
              </AppText>
            </View>
          ) : null}
          {d.needsAction.items.map((a) => {
            const k = KIND[a.kind];
            const title = t(k.title);
            return (
              <Row
                key={`${a.kind}-${a.jobId}`}
                icon={k.icon}
                tone={k.tone}
                title={a.note ? t('uiHome.withReason', { title, reason: a.note }) : title}
                sub={[a.customerName, a.teamName ?? t('uiOwner.noTeamYet'), `#${a.jobNumber}`].join(' · ')}
                onPress={() => openJob(a.jobId)}
              />
            );
          })}
          {more > 0 ? (
            <Pressable accessibilityRole="link" onPress={() => router.navigate({ pathname: '/jobs', params: { show: 'open' } })} hitSlop={12}>
              <AppText weight="semibold" color={colors.teal}>
                {t('uiHome.moreRows', { count: more })}
              </AppText>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      {d ? (
        <Card>
          <View style={styles.between}>
            <AppText variant="section">{t('uiOwner.todayCount', { count: d.todayByStatus.total })}</AppText>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.navigate({ pathname: '/jobs', params: { show: 'today' } })}
              hitSlop={12}
            >
              <AppText weight="semibold" color={colors.teal}>
                {t('uiOwner.seeAll')}
              </AppText>
            </Pressable>
          </View>
          <View style={styles.chips}>
            {GROUPS.map((g) => {
              const n = g.statuses.reduce((s, st) => s + d.todayByStatus[st], 0);
              return (
                <View key={g.key} style={[styles.countChip, { backgroundColor: tones[g.tone].fill }]}>
                  <AppText variant="small" weight="semibold" color={tones[g.tone].text} numberOfLines={1}>
                    {n} {t(`uiOwner.${g.key}`)}
                  </AppText>
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}

      {d ? (
        <Card>
          <View style={styles.between}>
            <View style={styles.flex}>
              <AppText variant="section">{t('uiHome.latest')}</AppText>
              <AppText variant="small" color={colors.slate}>
                {t('uiUpdates.latestSub')}
              </AppText>
            </View>
            <Pressable accessibilityRole="link" onPress={() => router.push('/updates')} hitSlop={12}>
              <AppText weight="semibold" color={colors.teal}>
                {t('uiOwner.seeAll')}
              </AppText>
            </Pressable>
          </View>
          {(d.updates?.latest ?? []).length === 0 ? (
            <AppText variant="support" color={colors.slate}>
              {t('uiHome.latestEmpty')}
            </AppText>
          ) : null}
          {(d.updates?.latest ?? []).map((u) => (
            <FeedRow key={u.id} item={u} />
          ))}
        </Card>
      ) : null}

      {d && d.money.readyToBill > 0 ? (
        <Card onPress={() => router.navigate('/billing')} accessibilityLabel={t('uiHome.readyToBill', { count: d.money.readyToBill })}>
          <View style={styles.between}>
            <View style={styles.flex}>
              <AppText weight="semibold">{t('uiHome.readyToBill', { count: d.money.readyToBill })}</AppText>
              <AppText variant="small" color={colors.slate}>
                {t('uiHome.readyToBillSub')}
              </AppText>
            </View>
            <AppText weight="semibold" color={colors.teal}>
              {t('uiHome.open')}
            </AppText>
          </View>
        </Card>
      ) : null}

      {d ? (
        <Card onPress={() => router.navigate('/billing')} accessibilityLabel={t('uiHome.moneyToCollect')}>
          <View style={styles.between}>
            <AppText variant="section">{t('uiHome.moneyToCollect')}</AppText>
            <AppText weight="semibold" color={colors.teal}>
              {t('uiHome.open')}
            </AppText>
          </View>
          <View style={styles.money}>
            <View style={styles.flex}>
              <AppText variant="title">{rupees(d.money.toCollect)}</AppText>
              <AppText variant="small" color={colors.slate}>
                {t('uiHome.fromBills')}
              </AppText>
            </View>
            <View style={styles.right}>
              <AppText variant="section" color={d.money.cashWithTeams > 0 ? colors.orange : colors.slate}>
                {rupees(d.money.cashWithTeams)}
              </AppText>
              <AppText variant="small" color={colors.slate}>
                {t('uiHome.withTeams')}
              </AppText>
            </View>
          </View>
        </Card>
      ) : null}

      <View style={styles.grid}>
        <QuickAction primary icon="plus" label={t('jobs.new')} onPress={() => router.push('/jobs/new')} />
        <QuickAction icon="account-plus-outline" label={t('customers.add')} onPress={() => router.push('/customers/new')} />
      </View>
    </Screen>
  );
}

function Row({ icon, tone, title, sub, onPress }: { icon: IconName; tone: Tone; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: tones[tone].fill }]}>
        <Icon name={icon} size={20} color={tones[tone].text} />
      </View>
      <View style={styles.flex}>
        <AppText weight="semibold" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="small" color={colors.slate} numberOfLines={1}>
          {sub}
        </AppText>
      </View>
      <Icon name="chevron-right" size={20} color={colors.muted} />
    </Pressable>
  );
}

function QuickAction({ icon, label, onPress, primary }: { icon: IconName; label: string; onPress: () => void; primary?: boolean }) {
  const fg = primary ? colors.white : colors.teal;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        primary ? styles.tilePrimary : styles.tilePlain,
        pressed && (primary ? styles.tilePrimaryPressed : styles.tilePlainPressed),
      ]}
    >
      <Icon name={icon} size={28} color={primary ? colors.white : colors.teal} />
      <AppText weight="semibold" color={fg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  needTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#B9CBF2',
    backgroundColor: colors.infoTint,
  },
  countBox: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.info, alignItems: 'center', justifyContent: 'center' },
  assignBtn: { minHeight: 40, paddingHorizontal: space.lg, borderRadius: radius.md, backgroundColor: colors.info, justifyContent: 'center' },
  empty: { alignItems: 'center', gap: space.xs, paddingVertical: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, paddingVertical: space.xs },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  money: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  countChip: { flexGrow: 1, borderRadius: radius.md, paddingHorizontal: space.sm, paddingVertical: space.sm, alignItems: 'center' },
  grid: { flexDirection: 'row', gap: space.md },
  tile: { flex: 1, minHeight: 100, borderRadius: radius.md, padding: space.lg, justifyContent: 'space-between', gap: space.md },
  tilePrimary: { backgroundColor: colors.teal },
  tilePrimaryPressed: { backgroundColor: colors.tealDark },
  // Same as a secondary button: teal border and text.
  tilePlain: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.teal },
  tilePlainPressed: { backgroundColor: colors.tealTint },
});
