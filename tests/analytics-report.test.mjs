import { describe, expect, it, vi } from 'vitest';
import { analyticsReport, reportQuery } from '../scripts/analytics-report.mjs';
describe('private Cloudflare analytics reports', () => {
  it('uses a bounded sampling-aware read query', () => {
    expect(reportQuery()).toContain("INTERVAL '30' DAY");
    expect(reportQuery(7)).toContain("INTERVAL '7' DAY");
    expect(reportQuery(7)).toContain('SUM(_sample_interval * double1)');
    expect(reportQuery()).toContain('LIMIT 500 FORMAT JSON');
    for (const days of [0, 91, 1.5, '7', "1'; DROP TABLE", NaN])
      expect(() => reportQuery(days)).toThrow();
  });
  it('authenticates read requests without exposing the token in output', async () => {
    const data = [
      { type: 'click', path: '/donate', action: 'account_copy', events: 10 },
    ];
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data }));
    expect(
      await analyticsReport(
        { accountId: 'a'.repeat(32), token: 'fixture-token', days: 7 },
        fetcher
      )
    ).toEqual(data);
    expect(fetcher).toHaveBeenCalledWith(
      `https://api.cloudflare.com/client/v4/accounts/${'a'.repeat(32)}/analytics_engine/sql`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer fixture-token',
          'Content-Type': 'text/plain',
        },
        body: reportQuery(7),
      })
    );
  });
  it('validates configuration and does not echo API error bodies', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('private details', { status: 403 }));
    await expect(
      analyticsReport(
        { accountId: '../unsafe', token: 'fixture-token' },
        fetcher
      )
    ).rejects.toThrow('Configura');
    expect(fetcher).not.toHaveBeenCalled();
    await expect(
      analyticsReport(
        { accountId: 'a'.repeat(32), token: 'fixture-token' },
        fetcher
      )
    ).rejects.toThrow('HTTP 403');
    fetcher.mockResolvedValueOnce(Response.json({ error: 'private' }));
    await expect(
      analyticsReport(
        { accountId: 'a'.repeat(32), token: 'fixture-token' },
        fetcher
      )
    ).rejects.toThrow('inválida');
  });
});
