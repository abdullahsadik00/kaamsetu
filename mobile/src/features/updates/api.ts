import { infiniteQueryOptions } from '@tanstack/react-query';

import { api } from '@/features/auth/session';

/** One row of "Updates from teams" (`GET /updates`, `GET /jobs/:id` → `updates`, T4.7). */
export type FeedItem = {
  id: string;
  kind: 'STATUS' | 'APPOINTMENT_FIXED' | 'PART_NEEDED' | 'NOTE' | 'REFUSED';
  jobId: string;
  /** Null when refused work named a job this business does not have. */
  jobNumber: number | null;
  customerName: string | null;
  by: string;
  /** Server time (the feed's order). */
  at: string;
  savedAt?: string;
  status?: string;
  side?: 'OURS' | 'CUSTOMER' | null;
  note?: string | null;
  appointment?: { date: string; slot: string };
  part?: { name: string; qty: number; canContinue: boolean };
  operation?: string;
  code?: string | null;
  payload?: unknown;
};

export type FeedPage = { items: FeedItem[]; nextCursor: string | null; unread: number; seenUpTo: string | null };
export type FeedFilter = 'ALL' | 'PROBLEMS';

export const UPDATES_KEY = ['updates'] as const;

/** Newest first, a page at a time ("Show older" asks for the next). */
export const updatesFeed = (filter: FeedFilter) =>
  infiniteQueryOptions({
    queryKey: [...UPDATES_KEY, filter],
    queryFn: ({ pageParam }) =>
      api.get<FeedPage>(`/updates?filter=${filter}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

/** The owner has seen everything received up to `upTo` (the newest row's time). */
export const markSeen = (upTo: string) => api.post<{ unread: number; seenUpTo: string | null }>('/updates/seen', { upTo });
