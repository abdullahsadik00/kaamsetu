import { create } from 'zustand';

import type { BusinessType } from '@/features/employees/api';

/**
 * What a new owner chose on "How do you work?" before logging in (D-044),
 * so "Your business" starts with it picked. Kept only while the app is open.
 */
export const useOnboardingChoice = create<{
  businessType: BusinessType | null;
  setBusinessType: (businessType: BusinessType) => void;
}>((set) => ({
  businessType: null,
  setBusinessType: (businessType) => set({ businessType }),
}));
