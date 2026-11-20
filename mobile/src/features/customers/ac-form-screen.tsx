import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { colors } from '@/theme/tokens';

import { addEquipment, CUSTOMERS_KEY, type AcType } from './api';

const TYPES: AcType[] = ['SPLIT', 'WINDOW', 'CASSETTE', 'DUCTABLE', 'TOWER', 'OTHER'];
const BRANDS = ['Voltas', 'LG', 'Daikin', 'Blue Star', 'Samsung', 'Hitachi', 'Lloyd', 'Carrier'] as const;
const ROOMS = ['Bedroom', 'Hall', 'Kitchen', 'Office'] as const;
const TONS = ['0.75', '1', '1.5', '2', '2.5', '3', 'unknown'] as const;
const GASES = ['R32', 'R22', 'R410A', 'unknown'] as const;

/** Add an AC at one of the customer's addresses; extra details hidden by default (T4.4). */
export function AcFormScreen() {
  const { t } = useTranslation();
  const { id, siteId } = useLocalSearchParams<{ id: string; siteId: string }>();
  const qc = useQueryClient();
  const [type, setType] = useState<AcType>('SPLIT');
  const [brand, setBrand] = useState<string | null>(null);
  const [otherBrand, setOtherBrand] = useState('');
  const [room, setRoom] = useState<string | null>(null);
  const [roomText, setRoomText] = useState('');
  const [tons, setTons] = useState<(typeof TONS)[number]>('1.5');
  const [more, setMore] = useState(false);
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [gas, setGas] = useState<(typeof GASES)[number]>('unknown');

  const save = useMutation({
    mutationFn: () => {
      const b = brand === 'other' ? otherBrand.trim() : brand;
      const r = roomText.trim() || (room ? t(`customers.rooms.${room}`) : '');
      return addEquipment({
        customerId: id,
        siteId,
        type,
        ...(b ? { brand: b } : {}),
        capacityTons: tons === 'unknown' ? null : Number(tons),
        ...(r ? { locationLabel: r } : {}),
        ...(model.trim() ? { model: model.trim() } : {}),
        ...(serial.trim() ? { serialNumber: serial.trim() } : {}),
        ...(gas !== 'unknown' ? { refrigerant: gas } : {}),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      router.back();
    },
  });

  return (
    <Screen
      footer={<Button label={t('customers.saveAc')} onPress={() => save.mutate()} loading={save.isPending} />}
    >
      <ChoiceChips
        label={t('customers.room')}
        options={ROOMS.map((r) => ({ value: r, label: t(`customers.rooms.${r}`) }))}
        value={room as (typeof ROOMS)[number] | null}
        onChange={(r) => {
          setRoom(r);
          setRoomText('');
        }}
      />
      <TextField
        label={t('customers.roomOther')}
        placeholder={t('customers.roomOtherHint')}
        value={roomText}
        onChangeText={setRoomText}
      />
      <ChoiceChips
        label={t('customers.acType')}
        options={TYPES.map((v) => ({ value: v, label: t(`customers.acTypes.${v}`) }))}
        value={type}
        onChange={setType}
      />
      <ChoiceChips
        label={t('customers.brand')}
        options={[
          ...BRANDS.map((b) => ({ value: b as string, label: b })),
          { value: 'other', label: t('customers.other') },
        ]}
        value={brand}
        onChange={setBrand}
      />
      {brand === 'other' ? (
        <TextField label={t('customers.brandName')} value={otherBrand} onChangeText={setOtherBrand} />
      ) : null}
      <ChoiceChips
        label={t('customers.capacity')}
        options={TONS.map((v) => ({
          value: v,
          label: v === 'unknown' ? t('customers.notSure') : `${v} ton`,
        }))}
        value={tons}
        onChange={setTons}
      />
      {more ? (
        <>
          <TextField label={t('customers.model')} value={model} onChangeText={setModel} />
          <TextField label={t('customers.serial')} value={serial} onChangeText={setSerial} />
          <ChoiceChips
            label={t('customers.gas')}
            options={GASES.map((g) => ({ value: g, label: g === 'unknown' ? t('customers.notSure') : g }))}
            value={gas}
            onChange={setGas}
          />
        </>
      ) : (
        <Button variant="text" label={t('customers.moreDetails')} onPress={() => setMore(true)} />
      )}
      {save.error ? <AppText color={colors.bad}>{errorMessage(t, save.error)}</AppText> : null}
    </Screen>
  );
}
