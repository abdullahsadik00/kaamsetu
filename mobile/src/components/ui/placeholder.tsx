import { useTranslation } from 'react-i18next';

import type { IconName } from './icon';
import { EmptyState } from './empty-state';
import { Screen } from './screen';

type Props = {
  title?: string;
  body?: string;
  icon?: IconName;
};

/** Empty state on its own screen, for tabs that are not built yet. */
export function Placeholder({ title, body, icon }: Props) {
  const { t } = useTranslation();
  return (
    <Screen>
      <EmptyState icon={icon} title={title ?? t('common.comingSoonTitle')} body={body ?? t('common.comingSoonBody')} />
    </Screen>
  );
}
