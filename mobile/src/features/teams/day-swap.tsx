import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ApiError, errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { ListRow } from '@/components/ui/list-row';
import { api } from '@/features/auth/session';
import { ConfirmSheet } from '@/features/customers/people-ui';
import { useEmployees } from '@/features/employees/api';
import { shortDate } from '@/features/field/data';
import { dayString } from '@/features/jobs/jobs';
import { useLanguage } from '@/localization/i18n';
import { colors, space } from '@/theme/tokens';

// ---------- API (T4.6, D-038) ----------

/** A helper lent to a team for one day (`GET /teams/:id?day=` → `borrowed` / `lentOut`). */
export type DayHelper = {
  lendingId: string;
  memberId: string;
  name: string;
  phone: string | null;
  fromTeamId: string | null;
  fromTeamName: string | null;
  toTeamId: string;
  toTeamName: string;
};
export type TeamDay = { id: string; name: string; members: { memberId: string }[]; day: string; borrowed: DayHelper[]; lentOut: DayHelper[] };

export const teamDayQuery = (id: string, day: string) =>
  queryOptions({ queryKey: ['teams', id, 'day', day], queryFn: () => api.get<TeamDay>(`/teams/${id}?day=${day}`) });
const lend = (teamId: string, body: { memberId: string; day: string }) => api.post<TeamDay>(`/teams/${teamId}/day-helpers`, body);
const undo = (teamId: string, lendingId: string) => api.request<TeamDay>('DELETE', `/teams/${teamId}/day-helpers/${lendingId}`);

const CODES = [
  'ALREADY_LENT',
  'ALREADY_IN_TEAM',
  'DAY_IN_PAST',
  'DAY_TOO_FAR',
  'NOT_A_HELPER',
  'TEAM_NOT_ACTIVE',
  'EMPLOYEE_NOT_ACTIVE',
  'LENDING_NOT_FOUND',
];

/** The server's swap refusals in plain words; anything else as usual. */
export function swapError(t: TFunction, e: unknown): string {
  return e instanceof ApiError && CODES.includes(e.code) ? t(`uiSwap.err_${e.code}`) : errorMessage(t, e);
}

function useDays() {
  const { t } = useTranslation();
  const language = useLanguage();
  return [
    { value: dayString(0), label: t('jobs.today') },
    { value: dayString(1), label: t('jobs.tomorrow') },
    { value: dayString(2), label: shortDate(dayString(2), language) },
  ];
}

/**
 * Team page "Swaps for the day" (T4.6, D-038): helpers lent to this team on a
 * day, its own helpers working elsewhere, undo, and "Lend a helper for a day"
 * to bring a helper in for that day only.
 */
export function DaySwapCard({ teamId, teamName }: { teamId: string; teamName: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const days = useDays();
  const [day, setDay] = useState(days[0].value);
  const [sheet, setSheet] = useState(false);
  const [undoing, setUndoing] = useState<DayHelper | null>(null);
  const info = useQuery(teamDayQuery(teamId, day));
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['teams'] });
    // Job lists show who works where.
    void qc.invalidateQueries({ queryKey: ['jobs'] });
  };
  const remove = useMutation({
    mutationFn: (l: DayHelper) => undo(l.toTeamId, l.lendingId),
    onSuccess: () => {
      setUndoing(null);
      refresh();
    },
  });

  const d = info.data;
  // A server without day swaps answers without these lists: hide the card rather than fail.
  if (d && (!Array.isArray(d.borrowed) || !Array.isArray(d.lentOut))) return null;
  const borrowed = d?.borrowed ?? [];
  const lentOut = d?.lentOut ?? [];
  const none = d && borrowed.length === 0 && lentOut.length === 0;
  return (
    <Card style={{ gap: space.sm }}>
      <SectionLabel>{t('uiSwap.dayCrew')}</SectionLabel>
      <ChoiceChips label={t('uiSwap.day')} options={days} value={day} onChange={setDay} />
      {info.isError ? <AppText color={colors.bad}>{errorMessage(t, info.error)}</AppText> : null}
      {none ? <AppText color={colors.slate}>{t('uiSwap.allHome')}</AppText> : null}
      {borrowed.map((l) => (
        <ListRow
          key={l.lendingId}
          avatar={l.name}
          title={l.name}
          subtitle={l.fromTeamName ? t('uiSwap.lentFrom', { team: l.fromTeamName }) : t('uiSwap.lentFromNone')}
          onPress={() => setUndoing(l)}
        />
      ))}
      {lentOut.map((l) => (
        <ListRow key={l.lendingId} avatar={l.name} title={l.name} subtitle={t('uiSwap.lentTo', { team: l.toTeamName })} onPress={() => setUndoing(l)} />
      ))}
      <Button variant="secondary" icon="account-switch-outline" label={t('uiSwap.lend')} onPress={() => setSheet(true)} />
      {remove.error ? <AppText color={colors.bad}>{swapError(t, remove.error)}</AppText> : null}

      <LendSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        teamId={teamId}
        teamName={teamName}
        members={new Set((d?.members ?? []).map((m) => m.memberId))}
        day={day}
        onDone={(newDay) => {
          setSheet(false);
          setDay(newDay);
          refresh();
        }}
      />
      <ConfirmSheet
        visible={undoing !== null}
        title={t('uiSwap.undoTitle')}
        body={t('uiSwap.undoBody', { name: undoing?.name ?? '' })}
        confirmLabel={t('uiSwap.undo')}
        onConfirm={() => undoing && remove.mutate(undoing)}
        onClose={() => setUndoing(null)}
        loading={remove.isPending}
      />
    </Card>
  );
}

/** "Lend a helper for a day": pick a helper who is not in this team, and the day. */
function LendSheet({
  visible,
  onClose,
  teamId,
  teamName,
  members,
  day: startDay,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  members: Set<string>;
  day: string;
  onDone: (day: string) => void;
}) {
  const { t } = useTranslation();
  const days = useDays();
  const employees = useQuery(useEmployees());
  const [memberId, setMemberId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const helpers = (employees.data ?? []).filter((e) => e.role === 'HELPER' && e.status === 'ACTIVE' && !members.has(e.id));
  const save = useMutation({
    mutationFn: (body: { memberId: string; day: string }) => lend(teamId, body),
    onSuccess: (_, body) => {
      setMemberId(null);
      setDay(null);
      onDone(body.day);
    },
  });
  const chosenDay = day ?? startDay;
  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        save.reset();
        onClose();
      }}
      title={t('uiSwap.lend')}
      subtitle={t('uiSwap.lendExplain')}
      footer={
        <Button
          label={t('uiSwap.save')}
          size="large"
          disabled={!memberId}
          loading={save.isPending}
          onPress={() => memberId && save.mutate({ memberId, day: chosenDay })}
        />
      }
    >
      {helpers.length === 0 && employees.isSuccess ? <AppText color={colors.slate}>{t('uiSwap.noHelpers')}</AppText> : null}
      {helpers.length ? (
        <ChoiceChips
          label={t('uiSwap.helper')}
          options={helpers.map((e) => ({ value: e.id, label: e.user.name || e.user.phone || '' }))}
          value={memberId}
          onChange={setMemberId}
        />
      ) : null}
      <View>
        <AppText variant="support" weight="semibold">
          {t('uiSwap.worksWith')}
        </AppText>
        <AppText>{teamName}</AppText>
      </View>
      <ChoiceChips label={t('uiSwap.day')} options={days} value={chosenDay} onChange={setDay} />
      {save.error ? <AppText color={colors.bad}>{swapError(t, save.error)}</AppText> : null}
    </BottomSheet>
  );
}
