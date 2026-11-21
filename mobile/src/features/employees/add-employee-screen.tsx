import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { colors } from '@/theme/tokens';

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

/** Owner adds a senior technician or helper (screen 64, D-027), then shows the invite QR. */
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
      footer={<Button icon="qrcode" label={t('employees.save')} onPress={() => submit()} loading={add.isPending} />}
    >
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label={t('employees.nameLabel')}
            placeholder={t('uiPeople.namePlaceholder')}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t('employees.nameError') : undefined}
          />
        )}
      />
      <Controller
        control={form.control}
        name="role"
        render={({ field }) => (
          <ChoiceChips
            label={t('employees.roleLabel')}
            options={ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) }))}
            value={field.value}
            onChange={field.onChange}
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
