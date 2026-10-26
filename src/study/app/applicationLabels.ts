import type { ApplicationEventType, ApplicationStage } from './api';

export const CLOSED_APPLICATION_STAGES = new Set<ApplicationStage>(['rejected', 'withdrawn']);

export const STAGE_LABEL: Record<ApplicationStage, string> = {
  considering: 'Considering',
  applied: 'Applied',
  online_test: 'Online test',
  interview: 'Interview',
  final: 'Final',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const EVENT_LABEL: Record<ApplicationEventType, string> = {
  deadline: 'Deadline',
  test_window: 'Test window',
  interview: 'Interview',
  other: 'Other',
};

export function eventUrgency(iso?: string): 'overdue' | 'soon' | 'later' | 'none' {
  if (!iso) return 'none';
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return 'none';
  const now = Date.now();
  if (at < now) return 'overdue';
  if (at - now < 7 * 24 * 60 * 60 * 1000) return 'soon';
  return 'later';
}
