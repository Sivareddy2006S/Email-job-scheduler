import type { EmailStatus } from '../types';

const STYLES: Record<EmailStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export default function StatusBadge({ status }: { status: EmailStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STYLES[status]}`}>
      {status}
    </span>
  );
}
