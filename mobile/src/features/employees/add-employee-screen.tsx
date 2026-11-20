import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { colors, radius, space, touch } from '@/theme/tokens';

import { addEmployee, EMPLOYEES_KEY, type StaffRole } from './api';

const schema = z.object({
  name: z.string().trim().min(2),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, ''))
    .pipe(z.string().regex(/^[6-9]\d{9}$/)),
  role: z.enum(['SENIOR_TECHNICIAN', 'HELPER']),
});

const ROLES: StaffRole[] = ['SENIOR_TECHNICIAN', 'HELPER'];

/** Owner adds a senior technician or helper (D-027), then shows the invite QR. */
export function AddEmployeeScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', role: 'SENIOR_TECHNICIAN' },
  });
  const add = useMutation({
    mutationFn: (v: z.output<typeof schema>) =>
      addEmployee({ name: v.name, phone: `+91${v.phone}`, role: v.role }),
    onSuccess: (employee) => {
      void qc.invalidateQueries({ queryKey: EMPLOYEES_KEY });
      // Straight to their page, where "Show invite QR" is.
      router.replace({ pathname: '/employees/[id]', params: { id: employee.id } });
    },
  });
  const submit = form.handleSubmit((v) => add.mutate(v));

  return (
    <Screen
      footer={<Button label={t('employees.save')} onPress={() => submit()} loading={add.isPending} />}
    >
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label={t('employees.nameLabel')}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t('employees.nameError') : undefined}
          />
        )}
      />
      <Controller
        control={form.control}
        name="phone"
        render={({ field, fieldState }) => (
          <TextField
            label={t('employees.phoneLabel')}
            prefix="+91"
            keyboardType="phone-pad"
            maxLength={12}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t('auth.phoneInvalid') : undefined}
          />
        )}
      />
      <Controller
        control={form.control}
        name="role"
        render={({ field }) => (
          <View style={{ gap: space.sm }}>
            <AppText variant="support" weight="semibold" color={colors.slate}>
              {t('employees.roleLabel')}
            </AppText>
            <View style={styles.row} accessibilityRole="radiogroup">
              {ROLES.map((r) => {
                const on = field.value === r;
                return (
                  <Pressable
                    key={r}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => field.onChange(r)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <AppText weight="semibold" color={on ? colors.white : colors.ink}>
                      {t(`roles.${r}`)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />
      <AppText variant="support" color={colors.slate}>
        {t('employees.addHint')}
      </AppText>
      {add.error ? (
        <AppText color={colors.bad} accessibilityLiveRegion="polite">
          {errorMessage(t, add.error)}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
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
