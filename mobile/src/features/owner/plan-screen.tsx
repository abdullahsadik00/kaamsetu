import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { api } from '@/features/auth/session';
import { rupees } from '@/features/billing/api';
import { useBusiness, usePlans, type PlanId, type PlanOption, type PlanState } from '@/features/employees/api';
import { i18n } from '@/localization/i18n';
import type { Tone } from '@/theme/tokens';
import { colors, radius, space } from '@/theme/tokens';

const DAY = 86_400_000;
const dateText = (iso: string) =>
  new Date(iso).toLocaleDateString(i18n.language === 'en' ? 'en-IN' : `${i18n.language}-IN`, { day: 'numeric', month: 'short', year: 'numeric' });
const daysUntil = (iso: string) => Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY));

/** One line for More: "Free trial · 12 days left", "Crew plan · till 20 Jan 2027", … */
export function planLine(t: TFunction, p: PlanState): string {
  if (p.access === 'READ_ONLY') return t('uiPlan.rowReadOnly');
  if (p.access === 'GRACE') return t('uiPlan.rowGrace');
  if (!p.endsAt) return t('uiPlan.title');
  if (p.plan === 'TRIAL') return t('uiPlan.rowTrial', { count: daysUntil(p.endsAt) });
  return t('uiPlan.rowPaid', { plan: t(`uiPlan.plan_${p.plan}`), date: dateText(p.endsAt) });
}

/** Home banner once the plan has ended (grace days, then view-only); nothing while it runs. */
export function PlanBanner({ plan }: { plan: PlanState | null | undefined }) {
  const { t } = useTranslation();
  if (!plan || plan.access === 'FULL') return null;
  const readOnly = plan.access === 'READ_ONLY';
  return (
    <Card tone="warm" style={styles.banner}>
      <View style={styles.bannerRow}>
        <Icon name={readOnly ? 'eye-outline' : 'alert-circle-outline'} size={22} color={readOnly ? colors.bad : colors.warn} />
        <AppText style={styles.flex} accessibilityLiveRegion="polite">
          {readOnly ? t('uiPlan.bannerReadOnly') : t('uiPlan.bannerGrace', { count: plan.graceEndsAt ? daysUntil(plan.graceEndsAt) : 1 })}
        </AppText>
      </View>
      <Button variant="secondary" label={t('uiPlan.choosePlan')} onPress={() => router.push('/plan')} />
    </Card>
  );
}

function StatusCard({ p }: { p: PlanState }) {
  const { t } = useTranslation();
  let badge: { label: string; tone: Tone };
  let title: string;
  let body: string;
  if (p.access === 'READ_ONLY') {
    badge = { label: t('uiPlan.badgeReadOnly'), tone: 'bad' };
    title = t('uiPlan.readOnlyTitle');
    body = t('uiPlan.readOnlyBody');
  } else if (p.access === 'GRACE' && p.graceEndsAt) {
    badge = { label: t('uiPlan.badgeGrace'), tone: 'warn' };
    title = t('uiPlan.graceTitle', { count: daysUntil(p.graceEndsAt) });
    body = t('uiPlan.graceBody', { date: dateText(p.graceEndsAt) });
  } else if (p.plan === 'TRIAL') {
    badge = { label: t('uiPlan.badgeTrial'), tone: 'teal' };
    title = p.endsAt ? t('uiPlan.daysLeft', { count: daysUntil(p.endsAt) }) : '';
    body = t('uiPlan.trialBody');
  } else {
    badge = { label: t('uiPlan.badgePaid'), tone: 'ok' };
    title = t('uiPlan.paidTitle', { plan: t(`uiPlan.plan_${p.plan}`) });
    body = p.endsAt ? t('uiPlan.paidBody', { date: dateText(p.endsAt) }) : '';
  }
  return (
    <Card style={styles.gap}>
      <View style={styles.badgeRow}>
        <Badge label={badge.label} tone={badge.tone} />
      </View>
      {title ? <AppText variant="title">{title}</AppText> : null}
      <AppText color={colors.slate}>{body}</AppText>
    </Card>
  );
}

type Period = 'month' | 'year';

function PlanCard({ option, period, selected, fits, current, tooSmall, onPress }: {
  option: PlanOption;
  period: Period;
  selected: boolean;
  fits: boolean;
  current: boolean;
  tooSmall: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const name = t(`uiPlan.plan_${option.id}`);
  const price = period === 'year' ? t('uiPlan.perYear', { price: rupees(option.yearly) }) : t('uiPlan.perMonth', { price: rupees(option.monthly) });
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: tooSmall }}
      accessibilityLabel={`${name}, ${price}`}
      disabled={tooSmall}
      onPress={onPress}
      style={[styles.plan, selected && styles.planOn, tooSmall && styles.planOff]}
    >
      <View style={styles.planHead}>
        <AppText variant="section" style={styles.flex}>{name}</AppText>
        {current ? <Badge label={t('uiPlan.current')} tone="ok" /> : fits ? <Badge label={t('uiPlan.fits')} tone="teal" /> : null}
      </View>
      <AppText variant="support" color={colors.slate}>
        {t(`uiPlan.planHint_${option.id}`, { teams: option.maxTeams ?? '' })}
      </AppText>
      <AppText variant="section" weight="bold">{price}</AppText>
      {tooSmall ? <AppText variant="small" color={colors.muted}>{t('uiPlan.tooSmall')}</AppText> : null}
    </Pressable>
  );
}

/**
 * Plan & payment (screen 72, D-045): where the trial or plan stands, the
 * three plans, and paying by UPI through a WhatsApp message to KaamSetu
 * until a payment provider is added; the plan is switched on from our side.
 */
export function PlanScreen() {
  const { t } = useTranslation();
  const business = useQuery(useBusiness());
  const plans = useQuery(usePlans());
  const support = useQuery({
    queryKey: ['support'],
    queryFn: () => api.get<{ whatsapp: string | null; email: string | null }>('/support'),
    staleTime: 60 * 60 * 1000,
  });
  const [period, setPeriod] = useState<Period>('month');
  const [picked, setPicked] = useState<PlanId | null>(null);
  const [noContact, setNoContact] = useState(false);

  const b = business.data;
  const state = b?.plan;
  const type = b?.businessType ?? 'VENDOR';
  const paidPlan = state && state.plan !== 'TRIAL' && state.access === 'FULL' ? state.plan : null;
  const chosen = picked ?? paidPlan ?? plans.data?.suggested ?? null;
  const option = plans.data?.plans.find((o) => o.id === chosen);

  const pay = () => {
    if (!option || !b) return;
    const whatsapp = support.data?.whatsapp;
    if (!whatsapp) {
      setNoContact(true);
      return;
    }
    const text = t('uiPlan.payMessage', {
      plan: t(`uiPlan.plan_${option.id}`),
      period: t(period === 'year' ? 'uiPlan.periodYear' : 'uiPlan.periodMonth'),
      price: rupees(period === 'year' ? option.yearly : option.monthly),
      business: b.name,
      phone: b.phone,
    });
    void Linking.openURL(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`).catch(() => setNoContact(true));
  };

  return (
    <Screen footer={<Button size="large" icon="whatsapp" label={t('uiPlan.pay')} onPress={pay} disabled={!option} />}>
      {state ? <StatusCard p={state} /> : null}
      <ChoiceChips
        label={t('uiPlan.title')}
        options={[
          { value: 'month', label: t('uiPlan.monthly') },
          { value: 'year', label: t('uiPlan.yearly') },
        ]}
        value={period}
        onChange={setPeriod}
      />
      <View accessibilityRole="radiogroup" style={styles.gap}>
        {(plans.data?.plans ?? []).map((o) => (
          <PlanCard
            key={o.id}
            option={o}
            period={period}
            selected={o.id === chosen}
            fits={o.id === plans.data?.suggested}
            current={o.id === paidPlan}
            tooSmall={!o.types.includes(type)}
            onPress={() => setPicked(o.id)}
          />
        ))}
      </View>
      <AppText variant="support" color={colors.slate}>{t('uiPlan.note')}</AppText>
      <AppText variant="support" color={colors.slate}>{t('uiPlan.afterPay')}</AppText>
      {noContact ? <AppText color={colors.bad} accessibilityLiveRegion="polite">{t('uiPlan.noContact')}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: space.sm },
  badgeRow: { flexDirection: 'row' },
  banner: { gap: space.md },
  bannerRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  plan: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  planOn: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  planOff: { opacity: 0.55 },
  planHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
