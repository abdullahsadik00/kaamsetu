import { useLocalSearchParams } from 'expo-router';

import { JobScreen } from '@/features/field/field';

/** Technician job page: details, Start / Update status / Finish (screens 20-30). */
export default function JobRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Keyed by id: a new job always starts from the details view.
  return <JobScreen key={id} id={id ?? ''} />;
}
