'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

type SeoTasks = {
  description: boolean;
  website: boolean;
  focus_keyword: boolean;
  meta_description: boolean;
};

type SeoBulkUpdaterStatus = {
  runId: string;
  state: 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number | null;
  totalCompanies?: number;
  savedCount?: number;
  failedCount?: number;
  progress?: { index: number; total: number } | null;
  lastCompany?: string | null;
  lastTasks?: string[] | null;
  lastMessage?: string | null;
  logTail?: string;
};

export function AdminSeoBulkUpdaterPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [adminChecked, setAdminChecked] = React.useState(false);
  const [tasks, setTasks] = React.useState<SeoTasks>({
    description: true,
    website: true,
    focus_keyword: true,
    meta_description: true,
  });
  const [batchLimit, setBatchLimit] = React.useState<number>(500);
  const [delayMs, setDelayMs] = React.useState<number>(3000);

  const [runId, setRunId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<SeoBulkUpdaterStatus | null>(null);
  const [polling, setPolling] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || authLoading) return;
    if (!user) {
      router.replace('/admin/login');
      return;
    }
    void (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        if (!(data as { is_admin?: boolean } | null)?.is_admin) {
          router.replace('/admin/login');
          return;
        }
        setAdminChecked(true);
      } catch {
        router.replace('/admin/login');
      }
    })();
  }, [user, authLoading, router]);

  const pollingIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = React.useCallback(() => {
    setPolling(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const fetchStatus = React.useCallback(
    async (id: string) => {
      const res = await fetch(
        `/api/admin/automation-tools/seo-bulk-updater/status?runId=${encodeURIComponent(id)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to fetch automation status');
      }
      const data = (await res.json()) as SeoBulkUpdaterStatus & { logTail?: string };
      setStatus(data);
      if (
        data.state &&
        (data.state === 'completed' || data.state === 'failed' || data.state === 'cancelled')
      ) {
        stopPolling();
      }
    },
    [stopPolling],
  );

  const startAutomation = async () => {
    if (polling) return;

    try {
      const res = await fetch('/api/admin/automation-tools/seo-bulk-updater/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks,
          batchLimit,
          delayMs,
        }),
      });

      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(data?.error || 'Failed to start automation');

      setRunId(data.runId as string);
      setStatus({
        runId: data.runId,
        state: 'starting',
      });

      toast.success('SEO Bulk Updater started.');
      setPolling(true);

      await fetchStatus(data.runId as string).catch((e) => console.warn('Initial status fetch failed:', e));

      pollingIntervalRef.current = setInterval(() => {
        void fetchStatus(data.runId as string).catch((e) => {
          console.warn('Status fetch failed:', e);
        });
      }, 2500);
    } catch (e: any) {
      console.error('Start automation error:', e);
      toast.error(e?.message || 'Failed to start automation');
    }
  };

  const cancelAutomation = async () => {
    if (!runId) return;
    try {
      const res = await fetch('/api/admin/automation-tools/seo-bulk-updater/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to cancel automation');
      }
      toast('Cancellation requested. Waiting for the job to stop…', { icon: 'ℹ️' });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to cancel automation');
    }
  };

  const resetView = () => {
    stopPolling();
    setRunId(null);
    setStatus(null);
  };

  if (!adminChecked && (authLoading || !user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }
  if (!adminChecked) return null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-3">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">SEO Bulk Updater</h2>
              <p className="text-sm text-gray-600">
                Updates missing/short/placeholder SEO fields for MLM companies using your GPT updater.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/automation-tools"
                className="inline-flex items-center px-4 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </Link>
              <button
                type="button"
                onClick={resetView}
                className="inline-flex items-center px-4 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                disabled={polling}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">SEO Tasks</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={tasks.description}
                  onChange={(e) => setTasks((t) => ({ ...t, description: e.target.checked }))}
                  disabled={polling}
                />
                <span className="text-sm text-gray-700">Description</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={tasks.website}
                  onChange={(e) => setTasks((t) => ({ ...t, website: e.target.checked }))}
                  disabled={polling}
                />
                <span className="text-sm text-gray-700">Website</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={tasks.focus_keyword}
                  onChange={(e) => setTasks((t) => ({ ...t, focus_keyword: e.target.checked }))}
                  disabled={polling}
                />
                <span className="text-sm text-gray-700">Focus keyword</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={tasks.meta_description}
                  onChange={(e) => setTasks((t) => ({ ...t, meta_description: e.target.checked }))}
                  disabled={polling}
                />
                <span className="text-sm text-gray-700">Meta description</span>
              </label>
            </div>

            <div className="pt-2 border-t border-gray-100 space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-800">Batch limit</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={batchLimit}
                  onChange={(e) => setBatchLimit(Number(e.target.value))}
                  disabled={polling}
                  className="w-full p-2 border border-gray-200 rounded-md text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-800">Delay between companies (ms)</label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  disabled={polling}
                  className="w-full p-2 border border-gray-200 rounded-md text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={startAutomation}
                disabled={polling}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
              >
                {polling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running…
                  </>
                ) : (
                  <>Start</>
                )}
              </button>
              <button
                type="button"
                onClick={cancelAutomation}
                disabled={!polling || !runId}
                className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-60"
                title="Request cancellation"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Notes: job updates only missing/short/placeholder fields. Cancellation stops after the current loop step.
            </p>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Processing log</h3>
              <div className="text-xs text-gray-500">
                Run:{' '}
                <span className="font-medium text-gray-800">{runId ?? '—'}</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 max-h-[360px] overflow-auto">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
                  {status?.logTail ?? 'Start the automation to view output…'}
                </pre>
              </div>
              {status?.state && status.state !== 'running' && status.state !== 'starting' ? (
                <div className="flex items-center gap-2 pt-1">
                  <div className="text-sm text-gray-700">
                    {status.state === 'completed'
                      ? `Completed. Saved: ${status.savedCount ?? 0}, Failed: ${status.failedCount ?? 0}.`
                      : status.state === 'cancelled'
                        ? `Cancelled. Saved: ${status.savedCount ?? 0}, Failed: ${status.failedCount ?? 0}.`
                        : `Failed. Saved: ${status.savedCount ?? 0}, Failed: ${status.failedCount ?? 0}.`}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

