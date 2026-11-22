import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { TFunction } from 'i18next';

import { api } from '@/features/auth/session';

/**
 * Downloads everything the business has entered (GET /organization/export)
 * into one JSON file and opens the share sheet, so the owner can keep it in
 * Drive, email or WhatsApp. Needs the internet.
 */
export async function shareBusinessData(t: TFunction): Promise<void> {
  const data = await api.get<{ exportedAt: string }>('/organization/export');
  const file = new File(Paths.cache, `kaamsetu-data-${data.exportedAt.slice(0, 10)}.json`);
  file.create({ overwrite: true });
  await file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: t('uiOwner.exportData') });
}
