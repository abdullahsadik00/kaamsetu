import { useTranslation } from 'react-i18next';

import { Placeholder } from '@/components/ui/placeholder';

/** Job list arrives with T4.7; until then the prototype's empty state. */
export default function MyWorkScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t('field.noJobs')} body={t('field.noJobsSub')} />;
}
