import { useState } from 'react';
import toast from 'react-hot-toast';
import { emailApi } from '../services/api';
import { parseRecipientsFile } from '../utils/csv';

interface Props {
  onClose: () => void;
  onScheduled: () => void;
}

export default function ComposeEmailModal({ onClose, onScheduled }: Props) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const { valid, invalid } = await parseRecipientsFile(file);
      setRecipients(valid);
      setInvalidCount(invalid.length);
      toast.success(`Detected ${valid.length} valid email(s)`);
    } catch {
      toast.error('Failed to parse file');
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required');
      return;
    }
    if (recipients.length === 0) {
      toast.error('Upload a file with at least one valid recipient');
      return;
    }
    if (!startTime) {
      toast.error('Please choose a start time');
      return;
    }

    setSubmitting(true);
    try {
      const result = await emailApi.schedule({
        subject,
        body,
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmails: delaySeconds * 1000,
        hourlyLimit,
        recipients,
      });
      toast.success(`Scheduled ${result.scheduledCount} email(s)`);
      onScheduled();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to schedule emails');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Compose New Email</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="Welcome to our product"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="Hello, ..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Upload Leads (CSV or text)</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="w-full text-sm"
            />
            {fileName && (
              <p className="mt-1 text-xs text-slate-500">
                {fileName} — Detected emails: <span className="font-medium">{recipients.length}</span>
                {invalidCount > 0 && <span className="text-amber-600"> ({invalidCount} invalid skipped)</span>}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Start Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Delay (seconds)</label>
              <input
                type="number"
                min={0}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Hourly Limit</label>
              <input
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Scheduling...' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
