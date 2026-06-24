import { describe, expect, it } from 'vitest';
import type { UsageHeaderSnapshot } from '@/services/api/usageService';
import { buildCodexQuotaWindowInfos } from './quota/codexQuota';
import { buildObservedCodexQuotaFromHeaderSnapshot } from './usageHeaderSnapshots';

describe('buildObservedCodexQuotaFromHeaderSnapshot', () => {
  it('normalizes Codex header quota metadata into usage quota windows', () => {
    const snapshot: UsageHeaderSnapshot = {
      event_hash: 'event-test',
      timestamp_ms: 1_700_000_000_000,
      response_metadata: {
        quota: {
          plan_type: 'free',
          active_limit: 'premium',
          credits_has_credits: false,
          credits_unlimited: false,
          rate_limit_reached_type: 'workspace_member_credits_depleted',
          primary_over_secondary_limit_percent: 20,
          primary: {
            used_percent: 20,
            reset_at_ms: 1_784_805_897_000,
            window_minutes: 43_200,
          },
          secondary: {
            used_percent: 0,
            window_minutes: 0,
          },
        },
      },
    };

    const observed = buildObservedCodexQuotaFromHeaderSnapshot(snapshot);

    expect(observed).toMatchObject({
      planType: 'free',
      activeLimit: 'premium',
      creditsHasCredits: false,
      creditsUnlimited: false,
      rateLimitReachedType: 'workspace_member_credits_depleted',
      primaryOverSecondaryLimitPercent: 20,
    });
    expect(observed?.payload?.rate_limit?.primary_window).toMatchObject({
      used_percent: 20,
      reset_at: 1_784_805_897,
      limit_window_seconds: 2_592_000,
    });
    expect(observed?.payload?.rate_limit?.secondary_window).toBeUndefined();

    const windows = buildCodexQuotaWindowInfos(observed?.payload ?? {});
    expect(windows).toMatchObject([
      {
        id: 'monthly',
        labelKey: 'codex_quota.monthly_window',
        usedPercent: 20,
        limitWindowSeconds: 2_592_000,
      },
    ]);
  });
});
