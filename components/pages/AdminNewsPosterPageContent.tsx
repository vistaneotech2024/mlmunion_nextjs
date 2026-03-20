'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import DatePicker from 'react-datepicker';

type NewsPosterStatus = {
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

export function AdminNewsPosterPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [adminChecked, setAdminChecked] = React.useState(false);
  const [newsRunId, setNewsRunId] = React.useState<string | null>(null);
  const [newsStatus, setNewsStatus] = React.useState<NewsPosterStatus | null>(null);
  const [newsPolling, setNewsPolling] = React.useState(false);
  const [topicInput, setTopicInput] = React.useState('');
  const languageOptions = [
    'English',
    'Hindi',
    'Spanish',
    'French',
    'German',
    'Portuguese',
    'Indonesian',
    'Urdu',
    'Arabic',
    'Bengali',
    'Chinese',
    'Russian',
    'Japanese',
    'Korean',
    'Turkish',
    'Italian',
    'Vietnamese',
    'Other',
  ] as const;
  type LanguageOption = (typeof languageOptions)[number];
  const [language, setLanguage] = React.useState<LanguageOption>('English');
  const [scheduleDate, setScheduleDate] = React.useState<Date | null>(null);
  const [scheduleTime, setScheduleTime] = React.useState<string>('09:30');

  type ScheduleEntry = {
    scheduleId: string;
    scheduledFor: string;
    createdAt: string;
    topics: string[];
    language: string;
    status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
    posterRunId?: string;
  };

  const [scheduledEntries, setScheduledEntries] = React.useState<ScheduleEntry[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<Date | null>(new Date());

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

  const loadSchedule = React.useCallback(async () => {
    const res = await fetch('/api/admin/automation-tools/news-poster/schedule', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return;
    const data = (await res.json()) as { entries: ScheduleEntry[] };
    setScheduledEntries(Array.isArray(data.entries) ? data.entries : []);
  }, []);

  React.useEffect(() => {
    if (!adminChecked) return;
    void loadSchedule().catch(() => {});
    const t = setInterval(() => {
      void loadSchedule().catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [adminChecked, loadSchedule]);

  const toDayKey = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.toISOString();
  };

  const newsPollingIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stopNewsPolling = React.useCallback(() => {
    setNewsPolling(false);
    if (newsPollingIntervalRef.current) {
      clearInterval(newsPollingIntervalRef.current);
      newsPollingIntervalRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => stopNewsPolling();
  }, [stopNewsPolling]);

  const fetchNewsStatus = React.useCallback(
    async (id: string) => {
      const res = await fetch(`/api/admin/automation-tools/news-poster/status?runId=${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to fetch news automation status');
      }
      const data = (await res.json()) as NewsPosterStatus & { logTail?: string };
      setNewsStatus(data);
      if (
        data.state &&
        (data.state === 'completed' || data.state === 'failed' || data.state === 'cancelled')
      ) {
        stopNewsPolling();
      }
    },
    [stopNewsPolling],
  );

  const startNewsAutomation = async () => {
    if (newsPolling) return;

    try {
      const parsedTopics = String(topicInput || '')
        .split(/[\n,]+/g)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 1);

      const res = await fetch('/api/admin/automation-tools/news-poster/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: parsedTopics.length ? parsedTopics : undefined,
          language,
        }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(data?.error || 'Failed to start news automation');

      setNewsRunId(data.runId as string);
      setNewsStatus({
        runId: data.runId,
        state: 'starting',
      });

      toast.success(parsedTopics.length ? `News automation started (${parsedTopics.length} topic).` : 'News automation started (auto topics).');
      setNewsPolling(true);

      await fetchNewsStatus(data.runId as string).catch((e) =>
        console.warn('Initial news status fetch failed:', e),
      );

      newsPollingIntervalRef.current = setInterval(() => {
        void fetchNewsStatus(data.runId as string).catch((e) => {
          console.warn('News status fetch failed:', e);
        });
      }, 2500);
    } catch (e: any) {
      console.error('Start news automation error:', e);
      toast.error(e?.message || 'Failed to start news automation');
    }
  };

  const scheduleNews = async () => {
    if (newsPolling) return;

    if (!scheduleDate) {
      toast.error('Select a schedule date');
      return;
    }
    if (!scheduleTime || !/^\d{2}:\d{2}$/.test(scheduleTime)) {
      toast.error('Select a valid schedule time');
      return;
    }

    const [hh, mm] = scheduleTime.split(':').map((n) => Number(n));
    const scheduled = new Date(scheduleDate);
    scheduled.setHours(hh, mm, 0, 0);

    if (scheduled.getTime() <= Date.now()) {
      toast.error('schedule date/time must be in the future');
      return;
    }

    const parsedTopics = String(topicInput || '')
      .split(/[\n,]+/g)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 1);

    try {
      const res = await fetch('/api/admin/automation-tools/news-poster/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: parsedTopics.length ? parsedTopics : undefined,
          language,
          scheduledAt: scheduled.toISOString(),
        }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to schedule news');
      }

      toast.success('News scheduled successfully.');
      setSelectedCalendarDate(new Date(scheduled));
      await loadSchedule().catch(() => {});
    } catch (e: any) {
      toast.error(e?.message || 'Failed to schedule news');
    }
  };

  const cancelScheduled = async (scheduleId: string) => {
    try {
      const res = await fetch('/api/admin/automation-tools/news-poster/schedule/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(data?.error || 'Failed to cancel schedule');
      toast('Schedule cancelled.');
      await loadSchedule().catch(() => {});
    } catch (e: any) {
      toast.error(e?.message || 'Failed to cancel schedule');
    }
  };

  const cancelNewsAutomation = async () => {
    if (!newsRunId) return;
    try {
      const res = await fetch('/api/admin/automation-tools/news-poster/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: newsRunId }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to cancel news automation');
      }
      toast('Cancellation requested. Waiting for the job to stop…', { icon: 'ℹ️' });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to cancel news automation');
    }
  };

  const resetNewsView = () => {
    stopNewsPolling();
    setNewsRunId(null);
    setNewsStatus(null);
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
              <h2 className="text-xl font-bold text-gray-900">News Post Automation</h2>
              <p className="text-sm text-gray-600">
                Generates 1 news topic and publishes 1 news post (with image) to your `news` table.
                You can override the topic using the input box (leave empty for auto-generate).
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
                onClick={resetNewsView}
                className="inline-flex items-center px-4 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                disabled={newsPolling}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Run</h3>
            <p className="text-sm text-gray-600">
              One run publishes 1 post immediately. Cancellation stops after the current step.
            </p>

            <div className="pt-2 border-t border-gray-100 space-y-2">
              <label className="text-sm font-medium text-gray-800">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageOption)}
                disabled={newsPolling}
                className="w-full p-2 border border-gray-200 rounded-md text-sm"
              >
                {languageOptions.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang === 'Other' ? 'Other (follow topic language)' : lang}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                The news content and SEO fields will be generated in this language.
              </p>

              <label className="text-sm font-medium text-gray-800">Input topics (optional)</label>
              <textarea
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                rows={5}
                placeholder={'Enter 1 topic.\nExample:\nNetwork marketing regulation in India'}
                disabled={newsPolling}
                className="w-full p-2 border border-gray-200 rounded-md text-sm"
              />
              <p className="text-xs text-gray-500">
                Leave empty to auto-generate topics.
              </p>
            </div>

            <div className="pt-2 border-t border-gray-100 space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Schedule News</h4>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule Date
                  </label>
                  <DatePicker
                    selected={scheduleDate}
                    onChange={(date: Date | null) => setScheduleDate(date)}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="YYYY-MM-DD"
                    minDate={new Date()}
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    disabled={newsPolling}
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={scheduleNews}
                disabled={newsPolling}
                className="w-full inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
              >
                Schedule
              </button>

              <p className="text-xs text-gray-500">Schedules 1 news post at the selected time.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={startNewsAutomation}
                disabled={newsPolling}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
              >
                {newsPolling ? (
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
                onClick={cancelNewsAutomation}
                disabled={!newsPolling || !newsRunId}
                className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Processing log</h3>
              <div className="text-xs text-gray-500">
                Run:{' '}
                <span className="font-medium text-gray-800">{newsRunId ?? '—'}</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 max-h-[360px] overflow-auto">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
                  {newsStatus?.logTail ?? 'Start the automation to view output…'}
                </pre>
              </div>
              {newsStatus?.state && newsStatus.state !== 'running' && newsStatus.state !== 'starting' ? (
                <div className="flex items-center gap-2 pt-1">
                  <div className="text-sm text-gray-700">
                    {newsStatus.state === 'completed'
                      ? `Completed. Saved: ${newsStatus.savedCount ?? 0}, Failed: ${newsStatus.failedCount ?? 0}.`
                      : newsStatus.state === 'cancelled'
                        ? `Cancelled. Saved: ${newsStatus.savedCount ?? 0}, Failed: ${newsStatus.failedCount ?? 0}.`
                        : `Failed. Saved: ${newsStatus.savedCount ?? 0}, Failed: ${newsStatus.failedCount ?? 0}.`}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Scheduled Calendar</h3>
              <div className="text-xs text-gray-500">
                Click a date to see scheduled runs.
              </div>

              {(() => {
                const active = scheduledEntries.filter((e) => e.status === 'scheduled' || e.status === 'running');
                const includeDates = active.map((e) => {
                  const d = new Date(e.scheduledFor);
                  d.setHours(0, 0, 0, 0);
                  return d;
                });
                const dayKeySet = new Set(includeDates.map((d) => toDayKey(d)));

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <DatePicker
                        inline
                        selected={selectedCalendarDate}
                        onChange={(d: Date | null) => setSelectedCalendarDate(d)}
                        includeDates={includeDates}
                        renderCustomHeader={undefined}
                        dayClassName={(date) => {
                          const dk = toDayKey(date);
                          return dayKeySet.has(dk) ? 'bg-indigo-100 text-indigo-700' : '';
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      {(() => {
                        const selected = selectedCalendarDate ? toDayKey(selectedCalendarDate) : null;
                        const items = selected
                          ? scheduledEntries.filter((e) => {
                              const dk = toDayKey(new Date(e.scheduledFor));
                              return dk === selected;
                            })
                          : [];

                        if (!items.length) {
                          return (
                            <div className="text-sm text-gray-600">
                              No scheduled runs for this date.
                            </div>
                          );
                        }

                        return items
                          .slice()
                          .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
                          .map((item) => {
                            const dt = new Date(item.scheduledFor);
                            const time = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div
                                key={item.scheduleId}
                                className="border border-gray-200 rounded-md p-2 bg-gray-50 space-y-1"
                              >
                                <div className="text-sm font-medium text-gray-900">
                                  {time} - {item.status}
                                </div>
                                <div className="text-xs text-gray-600 truncate">
                                  {item.topics?.[0] ? `Topic: ${item.topics[0]}` : `Auto-generated topic`}
                                </div>
                                {item.status === 'scheduled' && (
                                  <button
                                    type="button"
                                    className="text-xs text-red-600 hover:text-red-800 underline"
                                    onClick={() => cancelScheduled(item.scheduleId)}
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

