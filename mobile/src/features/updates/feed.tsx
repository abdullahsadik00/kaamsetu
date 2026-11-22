import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/features/field/parts';
import { useDayLabel } from '@/features/jobs/jobs';
import { useLanguage } from '@/localization/i18n';
import type { Language } from '@/localization/languages';
import { colors, radius, space, tones, type Tone } from '@/theme/tokens';

import { markSeen, updatesFeed, UPDATES_KEY, type FeedFilter, type FeedItem } from './api';

const OPS: Record<string, string> = {
  'job.start': 'op_start',
  'job.hold': 'op_hold',
  'job.complete': 'op_complete',
  'job.appointment': 'op_appointment',
  'job.part': 'op_part',
  'job.note': 'op_note',
};
const REASONS = [
  'JOB_CANCELLED',
  'JOB_REASSIGNED',
  'JOB_ALREADY_COMPLETED',
  'INVALID_STATUS_TRANSITION',
  'JOB_NOT_ACCESSIBLE',
  'VALIDATION_FAILED',
  'FORBIDDEN_ROLE',
  'EQUIPMENT_NOT_ON_JOB',
  'DEPENDENCY_FAILED',
];

type DayLabel = (d: string | null) => string;

/** The row's headline, e.g. "Part needed: 1 MCB 16A" or "Couldn't apply: job was cancelled". */
export function feedTitle(t: TFunction, item: FeedItem, dayLabel: DayLabel): string {
  const u = (key: string, o?: object) => t(`uiUpdates.${key}`, o as never);
  switch (item.kind) {
    case 'APPOINTMENT_FIXED': {
      const a = item.appointment;
      const when = a ? [dayLabel(a.date), t(`jobs.slots.${a.slot}`)].join(', ') : '';
      return u('appointmentAt', { when });
    }
    case 'PART_NEEDED': {
      const p = item.part;
      const title = u('partAt', { qty: p?.qty ?? 1, name: p?.name ?? '' });
      return p && !p.canContinue ? `${title} · ${u('stopped')}` : title;
    }
    case 'NOTE':
      return u('noteAt', { text: item.note ?? '' });
    case 'REFUSED':
      return u('refused', { reason: u(item.code && REASONS.includes(item.code) ? `r_${item.code}` : 'r_other') });
    default: {
      const title =
        item.status === 'ON_HOLD'
          ? u(item.side === 'OURS' ? 'holdOurs' : item.side === 'CUSTOMER' ? 'holdCustomer' : 'onHold')
          : item.status === 'IN_PROGRESS' || item.status === 'COMPLETED'
            ? u(`st_${item.status}`)
            : u('st_OTHER');
      return item.note ? u('withText', { title, text: item.note }) : title;
    }
  }
}

/** For refused work: what the technician had saved ("Work completed · ₹500 taken (Cash) · note"). */
export function refusedDetail(t: TFunction, item: FeedItem): string {
  const op = t(`uiUpdates.${OPS[item.operation ?? ''] ?? 'op_other'}`);
  const p = (item.payload ?? {}) as { collected?: { amount?: number; mode?: string } };
  const money =
    p.collected?.amount
      ? t('uiUpdates.money', {
          amount: `₹${(p.collected.amount / 100).toLocaleString('en-IN')}`,
          mode: t(p.collected.mode === 'UPI' ? 'field.upi' : 'field.cash'),
        })
      : null;
  return t('uiUpdates.savedWas', { what: [op, money, item.note].filter(Boolean).join(' · ') });
}

function look(item: FeedItem): { icon: IconName; tone: Tone } {
  switch (item.kind) {
    case 'APPOINTMENT_FIXED':
      return { icon: 'calendar-check-outline', tone: 'teal' };
    case 'PART_NEEDED':
      return { icon: 'package-variant-closed', tone: 'orange' };
    case 'NOTE':
      return { icon: 'note-text-outline', tone: 'info' };
    case 'REFUSED':
      return { icon: 'alert-circle-outline', tone: 'bad' };
    default:
      return item.status === 'COMPLETED'
        ? { icon: 'check', tone: 'ok' }
        : item.status === 'IN_PROGRESS'
          ? { icon: 'play', tone: 'warn' }
          : item.status === 'ON_HOLD'
            ? { icon: 'pause', tone: item.side === 'OURS' ? 'orange' : 'grey' }
            : { icon: 'sync', tone: 'grey' };
  }
}

/** "12:20 PM" today, "21 Nov, 12:20 PM" on other days. */
export function feedTime(at: string, language: Language): string {
  const d = new Date(at);
  const clock = d.toLocaleTimeString(`${language}-IN`, { hour: 'numeric', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString()
    ? clock
    : `${d.toLocaleDateString(`${language}-IN`, { day: 'numeric', month: 'short' })}, ${clock}`;
}

/**
 * One feed row (Stitch 03): tinted icon, headline, "customer · #job · person · time".
 * `onJob` hides the customer and job number (the job page already shows them).
 */
export function FeedRow({ item, onJob, unread }: { item: FeedItem; onJob?: boolean; unread?: boolean }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const dayLabel = useDayLabel();
  const l = look(item);
  const title = feedTitle(t, item, dayLabel);
  const sub = [
    onJob ? null : item.customerName,
    onJob || item.jobNumber === null ? null : `#${item.jobNumber}`,
    item.by || null,
    feedTime(item.at, language),
  ]
    .filter(Boolean)
    .join(' · ');
  const detail = item.kind === 'REFUSED' ? refusedDetail(t, item) : null;
  const canOpen = !onJob && item.jobNumber !== null;
  return (
    <Pressable
      accessibilityRole={canOpen ? 'button' : undefined}
      accessibilityLabel={[title, detail, sub].filter(Boolean).join('. ')}
      disabled={!canOpen}
      onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: item.jobId } })}
      style={({ pressed }) => [styles.row, unread && styles.unread, pressed && canOpen && { opacity: 0.7 }]}
    >
      <View style={[styles.icon, { backgroundColor: tones[l.tone].fill }]}>
        <Icon name={l.icon} size={20} color={tones[l.tone].text} />
      </View>
      <View style={styles.flex}>
        <AppText weight="semibold" numberOfLines={onJob ? undefined : 2} color={item.kind === 'REFUSED' ? colors.bad : colors.ink}>
          {title}
        </AppText>
        {detail ? (
          <AppText variant="small" color={colors.ink}>
            {detail}
          </AppText>
        ) : null}
        <AppText variant="small" color={colors.slate} numberOfLines={1}>
          {sub}
        </AppText>
      </View>
    </Pressable>
  );
}

/** The job page's "Updates from team" card (owner `GET /jobs/:id` → `updates`). */
export function JobFeed({ items }: { items: FeedItem[] | undefined }) {
  const { t } = useTranslation();
  if (!items) return null;
  return (
    <Card>
      <AppText variant="section">{t('uiUpdates.jobFeed')}</AppText>
      {items.length === 0 ? (
        <AppText variant="support" color={colors.slate}>
          {t('uiUpdates.jobFeedEmpty')}
        </AppText>
      ) : (
        items.map((i) => <FeedRow key={i.id} item={i} onJob />)
      )}
    </Card>
  );
}

/** Owner Home bell with the unread count (Stitch 02 → 03). */
export function UpdatesBell({ unread }: { unread: number }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? t('uiUpdates.bellNew', { count: unread }) : t('uiUpdates.bell')}
      onPress={() => router.push('/updates')}
      hitSlop={8}
      style={({ pressed }) => [styles.bell, pressed && { opacity: 0.7 }]}
    >
      <Icon name="bell-outline" size={26} color={colors.ink} />
      {unread > 0 ? (
        <View style={styles.badge} testID="updates-badge">
          <AppText variant="small" weight="bold" color={colors.white}>
            {unread > 99 ? '99+' : unread}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * "Updates from teams" (Stitch 03): everything teams sent, newest first, with
 * a "Delays & parts" tab. Opening it marks the rows as read.
 */
export function UpdatesScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FeedFilter>('ALL');
  const feed = useInfiniteQuery(updatesFeed(filter));
  const first = feed.data?.pages[0];
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const newest = first?.items[0]?.at;
  const unread = first?.unread ?? 0;

  // Read up to the newest row the owner is looking at; the Home bell then clears.
  const seenUpTo = first?.seenUpTo ?? null;
  useEffect(() => {
    if (!newest || unread === 0 || (seenUpTo && seenUpTo >= newest)) return;
    markSeen(newest)
      .then(() => qc.invalidateQueries({ queryKey: ['dashboard'] }))
      .catch(() => undefined);
  }, [newest, unread, seenUpTo, qc]);

  const unreadAfter = (at: string) => unread > 0 && (!seenUpTo || at > seenUpTo);

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => void qc.invalidateQueries({ queryKey: UPDATES_KEY })} />
      }
    >
      <Segmented
        label={t('uiUpdates.title')}
        options={[
          { value: 'ALL' as const, label: t('uiUpdates.all') },
          { value: 'PROBLEMS' as const, label: t('uiUpdates.problems') },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {feed.isPending ? <ActivityIndicator color={colors.teal} accessibilityLabel={t('common.loading')} /> : null}
      {feed.isError ? (
        <Card tone="warm">
          <AppText weight="semibold">{t('uiUpdates.loadError')}</AppText>
          <AppText color={colors.bad}>{errorMessage(t, feed.error)}</AppText>
          <Button variant="text" label={t('common.retry')} onPress={() => void feed.refetch()} />
        </Card>
      ) : null}
      {feed.isSuccess && items.length === 0 ? (
        <AppText color={colors.slate} style={styles.center}>
          {filter === 'ALL' ? t('uiUpdates.empty') : t('uiUpdates.emptyProblems')}
        </AppText>
      ) : null}
      {items.length ? (
        <View style={styles.list}>
          {items.map((i, n) => (
            <View key={i.id} style={n < items.length - 1 && styles.divider}>
              <FeedRow item={i} unread={unreadAfter(i.at)} />
            </View>
          ))}
        </View>
      ) : null}
      {feed.hasNextPage ? (
        <Button variant="text" label={t('uiUpdates.older')} onPress={() => void feed.fetchNextPage()} loading={feed.isFetchingNextPage} />
      ) : null}
      {feed.isSuccess ? (
        <AppText variant="support" color={colors.slate} style={styles.center}>
          {t('uiUpdates.footer')}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.rowLine },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.sm, paddingHorizontal: space.xs },
  unread: { backgroundColor: colors.tealTint },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bell: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.bad,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
