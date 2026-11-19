import { useTranslation } from 'react-i18next';

import { Placeholder } from '@/components/ui/placeholder';

/** The team's current job arrives with the jobs module; for now the prototype's note. */
export default function TodayScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t('field.noJobs')} body={t('helper.helperNote')} />;
}
