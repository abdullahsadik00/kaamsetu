import { useTranslation } from 'react-i18next';

import { Placeholder } from '@/components/ui/placeholder';

/** History (screen 31): not built yet, so the empty look only. */
export default function HistoryScreen() {
  const { t } = useTranslation();
  return <Placeholder icon="history" title={t('field.history')} body={t('uiField.historyBody')} />;
}
