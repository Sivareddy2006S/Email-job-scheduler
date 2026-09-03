import { useEffect, useState } from 'react';
import { emailApi } from '../services/api';
import type { EmailRecord } from '../types';
import StatusBadge from './StatusBadge';
import Pagination from './Pagination';

export default function ScheduledEmailsTable({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<EmailRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (searchQuery.trim()) {
        const data = await emailApi.search(searchQuery);
        // Search API currently returns all matches for the user, filter to scheduled locally
        const scheduledItems = data.items.filter(i => i.status === 'scheduled' || i.status === 'processing');
        setItems(scheduledItems);
        setTotal(scheduledItems.length);
        setPage(1);
      } else {
        const data = await emailApi.listScheduled(page);
        setItems(data.items);
        setTotal(data.total);
        setPageSize(data.pageSize);
      }
    } catch (err) {
      setError('Failed to load scheduled emails.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshKey, page]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 p-4 gap-4">
        <h2 className="font-semibold text-slate-900">Scheduled Emails</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <button
            onClick={load}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
          >
            Search
          </button>
        </div>
      </div>

      {loading && <div className="p-6 text-sm text-slate-500">Loading...</div>}
      {error && <div className="p-6 text-sm text-red-600">{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="p-6 text-sm text-slate-500">No scheduled emails yet. Compose one to get started.</div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Subject</th>
                  <th className="px-4 py-2 font-medium">Scheduled Time</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 text-slate-700">{item.recipient}</td>
                    <td className="px-4 py-3 text-slate-700">{item.subject}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(item.scheduledAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!searchQuery.trim() && (
            <Pagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
