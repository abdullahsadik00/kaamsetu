import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { api } from '@/features/auth/session';
import { useEmployees, type Employee } from '@/features/employees/api';
import { colors, radius, space, touch } from '@/theme/tokens';

// ---------- API (docs/06 §4, D-029) ----------

export type TeamMember = {
  memberId: string;
  position: 'SENIOR_TECHNICIAN' | 'HELPER';
  isPrimary: boolean;
  name: string;
  phone: string | null;
};
export type Team = { id: string; name: string; active: boolean; members: TeamMember[] };

const TEAMS_KEY = ['teams'] as const;
export const useTeams = () => queryOptions({ queryKey: TEAMS_KEY, queryFn: () => api.get<Team[]>('/teams') });
const useTeam = (id: string) =>
  queryOptions({ queryKey: [...TEAMS_KEY, id], queryFn: () => api.get<Team>(`/teams/${id}`) });

export const createTeam = (body: { name: string; seniorMemberId?: string; helperMemberIds: string[] }) =>
  api.post<Team>('/teams', body);
const updateTeam = (id: string, body: { name?: string; active?: boolean }) =>
  api.request<Team>('PATCH', `/teams/${id}`, { body });
const addMember = (id: string, memberId: string, primary?: boolean) =>
  api.post<Team>(`/teams/${id}/members`, { memberId, ...(primary !== undefined ? { primary } : {}) });
const removeMember = (id: string, memberId: string) =>
  api.request<Team>('DELETE', `/teams/${id}/members/${memberId}`);

const staff = (list: Employee[] | undefined, role: Employee['role']) =>
  (list ?? []).filter((e) => e.role === role && e.status === 'ACTIVE');

function memberLine(t: (k: string) => string, team: Team): string {
  const senior = team.members.find((m) => m.isPrimary)?.name;
  const helpers = team.members.filter((m) => m.position === 'HELPER').map((m) => m.name);
  return [senior ?? t('teams.noSenior'), ...helpers].join(' · ');
}

// ---------- Teams list ----------

export function TeamsScreen() {
  const { t } = useTranslation();
  const teams = useQuery(useTeams());
  if (teams.isPending) return <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />;
  return (
    <Screen footer={<Button label={t('teams.add')} onPress={() => router.push('/teams/new')} />}>
      {teams.isError ? <AppText color={colors.bad}>{errorMessage(t, teams.error)}</AppText> : null}
      {teams.data?.length === 0 ? <AppText color={colors.slate}>{t('teams.empty')}</AppText> : null}
      {teams.data?.map((team) => (
        <Pressable
          key={team.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/teams/[id]', params: { id: team.id } })}
          style={({ pressed }) => [styles.row, !team.active && styles.off, pressed && { opacity: 0.8 }]}
        >
          <AppText weight="semibold">
            {team.name}
            {team.active ? '' : ` · ${t('teams.inactive')}`}
          </AppText>
          <AppText variant="support" color={colors.slate}>
            {memberLine(t, team)}
          </AppText>
        </Pressable>
      ))}
    </Screen>
  );
}

// ---------- New team ----------

export function NewTeamScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const employees = useQuery(useEmployees());
  const teams = useQuery(useTeams());
  const [name, setName] = useState('');
  const [senior, setSenior] = useState<string | null>(null);
  const [helpers, setHelpers] = useState<string[]>([]);
  const suggested = t('teams.defaultName', { n: (teams.data?.length ?? 0) + 1 });
  const save = useMutation({
    mutationFn: () =>
      createTeam({
        name: name.trim() || suggested,
        ...(senior ? { seniorMemberId: senior } : {}),
        helperMemberIds: helpers,
      }),
    onSuccess: (team) => {
      void qc.invalidateQueries({ queryKey: TEAMS_KEY });
      router.replace({ pathname: '/teams/[id]', params: { id: team.id } });
    },
  });
  const seniors = staff(employees.data, 'SENIOR_TECHNICIAN');
  const helperList = staff(employees.data, 'HELPER');

  return (
    <Screen footer={<Button label={t('teams.save')} onPress={() => save.mutate()} loading={save.isPending} />}>
      <AppText color={colors.slate}>{t('teams.explain')}</AppText>
      <TextField label={t('teams.name')} placeholder={suggested} value={name} onChangeText={setName} />
      {seniors.length ? (
        <ChoiceChips
          label={t('teams.senior')}
          options={seniors.map((e) => ({ value: e.id, label: e.user.name || e.user.phone || '' }))}
          value={senior}
          onChange={setSenior}
        />
      ) : (
        <AppText color={colors.slate}>{t('teams.noSeniorsYet')}</AppText>
      )}
      {helperList.length ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="support" weight="semibold" color={colors.slate}>
            {t('teams.helpers')}
          </AppText>
          <View style={styles.chips}>
            {helperList.map((e) => {
              const on = helpers.includes(e.id);
              return (
                <Pressable
                  key={e.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => setHelpers((h) => (on ? h.filter((x) => x !== e.id) : [...h, e.id]))}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <AppText weight="semibold" color={on ? colors.white : colors.ink}>
                    {e.user.name || e.user.phone}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <Button variant="text" label={t('teams.addStaffFirst')} onPress={() => router.push('/employees/new')} />
      {save.error ? <AppText color={colors.bad}>{errorMessage(t, save.error)}</AppText> : null}
    </Screen>
  );
}

// ---------- Team page ----------

export function TeamScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const team = useQuery(useTeam(id));
  const employees = useQuery(useEmployees());
  const [name, setName] = useState<string | null>(null);
  const done = (updated: Team) => {
    qc.setQueryData([...TEAMS_KEY, id], updated);
    void qc.invalidateQueries({ queryKey: TEAMS_KEY });
  };
  const add = useMutation({ mutationFn: (memberId: string) => addMember(id, memberId), onSuccess: done });
  const makePrimary = useMutation({ mutationFn: (memberId: string) => addMember(id, memberId, true), onSuccess: done });
  const remove = useMutation({ mutationFn: (memberId: string) => removeMember(id, memberId), onSuccess: done });
  const edit = useMutation({ mutationFn: (body: { name?: string; active?: boolean }) => updateTeam(id, body), onSuccess: done });

  if (team.isPending) return <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />;
  if (team.isError) {
    return (
      <Screen>
        <AppText color={colors.bad}>{errorMessage(t, team.error)}</AppText>
      </Screen>
    );
  }
  const tm = team.data;
  const inTeam = new Set(tm.members.map((m) => m.memberId));
  const available = (employees.data ?? []).filter(
    (e) => e.status === 'ACTIVE' && e.role !== 'OWNER' && !inTeam.has(e.id),
  );
  const error = add.error ?? remove.error ?? edit.error ?? makePrimary.error;

  const confirmRemove = (m: TeamMember) =>
    Alert.alert(t('teams.removeTitle'), m.name, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('teams.remove'), style: 'destructive', onPress: () => remove.mutate(m.memberId) },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: tm.name }} />
      <View style={styles.card}>
        <TextField label={t('teams.name')} value={name ?? tm.name} onChangeText={setName} />
        {name !== null && name.trim() && name.trim() !== tm.name ? (
          <Button variant="secondary" label={t('teams.rename')} onPress={() => edit.mutate({ name: name.trim() })} />
        ) : null}
      </View>
      <View style={styles.card}>
        {tm.members.length === 0 ? <AppText color={colors.slate}>{t('teams.noMembers')}</AppText> : null}
        {tm.members.map((m) => (
          <View key={m.memberId} style={styles.member}>
            <View style={{ flex: 1 }}>
              <AppText weight="semibold">{m.name}</AppText>
              <AppText variant="support" color={colors.slate}>
                {t(`roles.${m.position}`)}
                {m.isPrimary ? ` · ${t('teams.primary')}` : ''}
              </AppText>
            </View>
            {m.position === 'SENIOR_TECHNICIAN' && !m.isPrimary ? (
              <Button variant="text" label={t('teams.makePrimary')} onPress={() => makePrimary.mutate(m.memberId)} />
            ) : null}
            <Button variant="text" label={t('teams.remove')} onPress={() => confirmRemove(m)} />
          </View>
        ))}
      </View>
      {available.length ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="support" weight="semibold" color={colors.slate}>
            {t('teams.addMember')}
          </AppText>
          {available.map((e) => (
            <Button
              key={e.id}
              variant="secondary"
              label={`${e.user.name || e.user.phone} · ${t(`roles.${e.role}`)}`}
              onPress={() => add.mutate(e.id)}
              loading={add.isPending && add.variables === e.id}
            />
          ))}
        </View>
      ) : null}
      <Button
        variant="text"
        label={tm.active ? t('teams.deactivate') : t('teams.activate')}
        onPress={() => edit.mutate({ active: !tm.active })}
      />
      {error ? <AppText color={colors.bad}>{errorMessage(t, error)}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch.action + 8,
    padding: space.md,
    gap: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  off: { backgroundColor: colors.soft },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
  },
  member: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: touch.min,
    paddingHorizontal: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.line2,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.teal, borderColor: colors.teal },
});
