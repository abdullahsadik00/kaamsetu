import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel } from '@/components/ui/card';
import { ChoiceChips, MultiChoiceChips } from '@/components/ui/choice-chips';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { api } from '@/features/auth/session';
import { ConfirmSheet, SwitchCard } from '@/features/customers/people-ui';
import { useEmployees, type Employee } from '@/features/employees/api';
import { colors, space } from '@/theme/tokens';

import { DaySwapCard } from './day-swap';

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

const personName = (e: Employee) => e.user.name || e.user.phone || '';

// ---------- Teams list (screen 60) ----------

export function TeamsScreen() {
  const { t } = useTranslation();
  const teams = useQuery(useTeams());
  if (teams.isPending) return <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />;
  return (
    <Screen footer={<Button icon="plus" label={t('teams.add')} onPress={() => router.push('/teams/new')} />}>
      {teams.isError ? <AppText color={colors.bad}>{errorMessage(t, teams.error)}</AppText> : null}
      {teams.data?.length === 0 ? (
        <EmptyState icon="account-group-outline" title={t('uiPeople.teamsEmptyTitle')} body={t('teams.empty')} />
      ) : null}
      {teams.data?.map((team) => {
        const senior = team.members.find((m) => m.isPrimary);
        const others = team.members.filter((m) => m !== senior);
        return (
          <Card
            key={team.id}
            tone={team.active ? 'plain' : 'recessed'}
            accessibilityLabel={team.name}
            onPress={() => router.push({ pathname: '/teams/[id]', params: { id: team.id } })}
          >
            <View style={styles.titleRow}>
              <AppText variant="section" style={styles.flex}>
                {team.name}
              </AppText>
              {team.active ? null : <Badge tone="grey" label={t('teams.inactive')} />}
            </View>
            <AppText color={senior ? colors.ink : colors.muted}>
              {senior ? `${senior.name} · ${t('roles.SENIOR_TECHNICIAN')}` : t('teams.noSenior')}
            </AppText>
            {others.map((m) => (
              <AppText key={m.memberId} color={colors.slate}>
                {m.name} · {t(`roles.${m.position}`)}
              </AppText>
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}

// ---------- New team (screen 62) ----------

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
      <AppText variant="support" color={colors.slate}>
        {t('teams.explain')}
      </AppText>
      <TextField label={t('teams.name')} placeholder={suggested} value={name} onChangeText={setName} />
      {seniors.length ? (
        <ChoiceChips
          label={t('teams.senior')}
          options={seniors.map((e) => ({ value: e.id, label: personName(e) }))}
          value={senior}
          onChange={setSenior}
        />
      ) : (
        <View style={{ gap: space.xs }}>
          <AppText variant="support" weight="semibold">
            {t('teams.senior')}
          </AppText>
          <AppText variant="support" color={colors.slate}>
            {t('teams.noSeniorsYet')}
          </AppText>
        </View>
      )}
      {helperList.length ? (
        <MultiChoiceChips
          label={t('uiPeople.helpersOptional')}
          options={helperList.map((e) => ({ value: e.id, label: personName(e) }))}
          value={helpers}
          onChange={setHelpers}
        />
      ) : null}
      <Button variant="secondary" icon="plus" label={t('uiPeople.newPerson')} onPress={() => router.push('/employees/new')} />
      {save.error ? <AppText color={colors.bad}>{errorMessage(t, save.error)}</AppText> : null}
    </Screen>
  );
}

// ---------- Team page (screen 61) ----------

export function TeamScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const team = useQuery(useTeam(id));
  const employees = useQuery(useEmployees());
  const [name, setName] = useState<string | null>(null);
  const [picked, setPicked] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [adding, setAdding] = useState(false);
  const done = (updated: Team) => {
    qc.setQueryData([...TEAMS_KEY, id], updated);
    void qc.invalidateQueries({ queryKey: TEAMS_KEY });
  };
  const add = useMutation({ mutationFn: (memberId: string) => addMember(id, memberId), onSuccess: done });
  const makePrimary = useMutation({
    mutationFn: (memberId: string) => addMember(id, memberId, true),
    onSuccess: (updated) => {
      setPicked(null);
      done(updated);
    },
  });
  const remove = useMutation({
    mutationFn: (memberId: string) => removeMember(id, memberId),
    onSuccess: (updated) => {
      setRemoving(null);
      done(updated);
    },
  });
  const edit = useMutation({
    mutationFn: (body: { name?: string; active?: boolean }) => updateTeam(id, body),
    onSuccess: done,
  });

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
  const linked = new Map((employees.data ?? []).map((e) => [e.id, e.loginLinked]));
  const available = (employees.data ?? []).filter(
    (e) => e.status === 'ACTIVE' && e.role !== 'OWNER' && !inTeam.has(e.id),
  );
  const error = remove.error ?? edit.error ?? makePrimary.error;
  const subtitle = (m: TeamMember) =>
    [
      t(`roles.${m.position}`),
      m.isPrimary ? t('teams.primary') : null,
      linked.has(m.memberId) ? (linked.get(m.memberId) ? t('uiPeople.usesApp') : t('uiPeople.notJoined')) : null,
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <Screen>
      <Stack.Screen options={{ title: tm.name }} />
      <Card style={{ gap: 0 }}>
        <SectionLabel>{t('uiPeople.members')}</SectionLabel>
        {tm.members.length === 0 ? (
          <AppText color={colors.slate} style={{ paddingTop: space.sm }}>
            {t('teams.noMembers')}
          </AppText>
        ) : null}
        {tm.members.map((m, i) => (
          <ListRow
            key={m.memberId}
            avatar={m.name}
            title={m.name}
            subtitle={subtitle(m)}
            divider={i < tm.members.length - 1}
            onPress={() => setPicked(m)}
          />
        ))}
      </Card>
      <SwitchCard
        title={t('uiPeople.teamInUse')}
        hint={t('uiPeople.teamInUseHint')}
        value={tm.active}
        onChange={(active) => edit.mutate({ active })}
      />
      {tm.active ? <DaySwapCard teamId={id} teamName={tm.name} /> : null}
      <Button
        variant="secondary"
        icon="account-multiple-plus-outline"
        label={t('uiPeople.changeMembers')}
        onPress={() => setAdding(true)}
      />
      <Card>
        <TextField label={t('teams.name')} value={name ?? tm.name} onChangeText={setName} />
        {name !== null && name.trim() && name.trim() !== tm.name ? (
          <Button variant="secondary" label={t('teams.rename')} onPress={() => edit.mutate({ name: name.trim() })} />
        ) : null}
      </Card>
      {error ? <AppText color={colors.bad}>{errorMessage(t, error)}</AppText> : null}

      {/* One member: call, make lead, remove. */}
      <BottomSheet
        visible={picked !== null}
        onClose={() => setPicked(null)}
        title={picked?.name ?? ''}
        subtitle={picked ? subtitle(picked) : undefined}
      >
        {picked?.phone ? (
          <Button
            variant="secondary"
            icon="phone-outline"
            label={t('customers.call')}
            onPress={() => Linking.openURL(`tel:${picked.phone}`)}
          />
        ) : null}
        {picked && picked.position === 'SENIOR_TECHNICIAN' && !picked.isPrimary ? (
          <Button
            variant="secondary"
            icon="star-outline"
            label={t('teams.makePrimary')}
            onPress={() => makePrimary.mutate(picked.memberId)}
            loading={makePrimary.isPending}
          />
        ) : null}
        <Button
          variant="destructive"
          icon="account-remove-outline"
          label={t('teams.remove')}
          onPress={() => {
            setRemoving(picked);
            setPicked(null);
          }}
        />
      </BottomSheet>

      {/* Add people to this team. */}
      <BottomSheet
        visible={adding}
        onClose={() => setAdding(false)}
        title={t('teams.addMember')}
        footer={<Button label={t('uiPeople.done')} onPress={() => setAdding(false)} />}
      >
        {available.length === 0 ? (
          <AppText color={colors.slate}>{t('uiPeople.noOneToAdd')}</AppText>
        ) : (
          available.map((e, i) => (
            <ListRow
              key={e.id}
              avatar={personName(e)}
              title={personName(e)}
              subtitle={t(`roles.${e.role}`)}
              divider={i < available.length - 1}
              right={
                add.isPending && add.variables === e.id ? (
                  <ActivityIndicator color={colors.teal} />
                ) : (
                  <Badge tone="teal" icon="plus" label={t('teams.addMember')} />
                )
              }
              onPress={() => add.mutate(e.id)}
            />
          ))
        )}
        {add.error ? <AppText color={colors.bad}>{errorMessage(t, add.error)}</AppText> : null}
      </BottomSheet>

      <ConfirmSheet
        visible={removing !== null}
        title={t('teams.removeTitle')}
        body={removing?.name ?? ''}
        confirmLabel={t('teams.remove')}
        onConfirm={() => removing && remove.mutate(removing.memberId)}
        onClose={() => setRemoving(null)}
        loading={remove.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
