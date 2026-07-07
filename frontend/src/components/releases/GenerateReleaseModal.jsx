import { useState } from 'react';
import { format, startOfDay, endOfDay, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';
import { useCreateReleaseNoteMutation } from '@/features/releases/releaseApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import Modal from '@/components/ui/Modal.jsx';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import DatePicker from '@/components/ui/DatePicker.jsx';

export default function GenerateReleaseModal({ open, onClose, onCreated }) {
  const [create, { isLoading }] = useCreateReleaseNoteMutation();
  const now = new Date();
  const [from, setFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(now, 'yyyy-MM-dd'));
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!from || !to) return toast.error('Pick a start and end date');
    if (new Date(from) > new Date(to)) return toast.error('Start date must be on or before end date');
    try {
      const res = await create({
        from: startOfDay(new Date(from)).toISOString(),
        to: endOfDay(new Date(to)).toISOString(),
        version: version.trim(),
        title: title.trim(),
        details,
      }).unwrap();
      toast.success('Release note generated');
      onClose();
      onCreated?.(res.data.releaseNote.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
    return undefined;
  };

  return (
    <Modal open={open} onClose={onClose} title="Generate release note">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Date range · tasks completed in this window
          </p>
          <div className="flex items-center gap-2">
            <DatePicker value={from} max={to || undefined} onChange={setFrom} aria-label="From date" />
            <span className="shrink-0 text-gray-400">→</span>
            <DatePicker value={to} min={from || undefined} onChange={setTo} align="end" aria-label="To date" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Version (optional)" placeholder="v1.2.0" value={version} onChange={(e) => setVersion(e.target.value)} />
          <Input label="Title (optional)" placeholder="Auto from dates" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label htmlFor="rel-details" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Release notes / overview (optional)
          </label>
          <textarea
            id="rel-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            placeholder="Highlights, context, or a summary to include at the top of the document…"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-xs focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-gray-800/70"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            <Sparkles className="h-4 w-4" /> Generate
          </Button>
        </div>
      </form>
    </Modal>
  );
}
