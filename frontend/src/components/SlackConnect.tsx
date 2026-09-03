import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { slackApi } from '../services/api';
import type { SlackConnection } from '../types';

export default function SlackConnect() {
  const [status, setStatus] = useState<SlackConnection | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await slackApi.status();
      setStatus(data);
    } catch {
      setStatus({ connected: false, teamName: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get('slack') === 'connected') toast.success('Slack connected!');
    if (params.get('slack') === 'error') toast.error('Failed to connect Slack');
  }, []);

  const disconnect = async () => {
    await slackApi.disconnect();
    toast.success('Slack disconnected');
    load();
  };

  if (loading) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <div className="text-sm font-medium text-slate-900">Slack Notifications</div>
        <div className="text-xs text-slate-500">
          {status?.connected
            ? `Connected to ${status.teamName ?? 'Slack'}. You'll get alerts when hourly limits are reached.`
            : 'Connect Slack to receive alerts when an hourly sending limit is reached.'}
        </div>
      </div>
      {status?.connected ? (
        <button
          onClick={disconnect}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Disconnect
        </button>
      ) : (
        <a
          href={slackApi.connectUrl}
          className="rounded-lg bg-[#4A154B] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Connect Slack
        </a>
      )}
    </div>
  );
}
