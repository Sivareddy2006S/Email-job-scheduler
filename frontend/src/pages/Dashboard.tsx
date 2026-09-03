import { useState } from 'react';
import Header from '../components/Header';
import SlackConnect from '../components/SlackConnect';
import ScheduledEmailsTable from '../components/ScheduledEmailsTable';
import SentEmailsTable from '../components/SentEmailsTable';
import ComposeEmailModal from '../components/ComposeEmailModal';

type Tab = 'scheduled' | 'sent';

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('scheduled');
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header onCompose={() => setComposeOpen(true)} />

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <SlackConnect />

        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setTab('scheduled')}
            className={`px-4 py-2 text-sm font-medium ${
              tab === 'scheduled'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Scheduled Emails
          </button>
          <button
            onClick={() => setTab('sent')}
            className={`px-4 py-2 text-sm font-medium ${
              tab === 'sent' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sent Emails
          </button>
        </div>

        {tab === 'scheduled' ? (
          <ScheduledEmailsTable refreshKey={refreshKey} />
        ) : (
          <SentEmailsTable refreshKey={refreshKey} />
        )}
      </main>

      {composeOpen && (
        <ComposeEmailModal
          onClose={() => setComposeOpen(false)}
          onScheduled={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
