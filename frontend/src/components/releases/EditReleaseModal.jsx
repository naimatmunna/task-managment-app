import { useState } from 'react';
import toast from 'react-hot-toast';
import { useUpdateReleaseNoteMutation } from '@/features/releases/releaseApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import Modal from '@/components/ui/Modal.jsx';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';

/** Edit a release note's metadata (title, version, overview). Tasks are changed via Regenerate. */
export default function EditReleaseModal({ open, onClose, note }) {
  const [update, { isLoading }] = useUpdateReleaseNoteMutation();
  const [title, setTitle] = useState(note?.title || '');
  const [version, setVersion] = useState(note?.version || '');
  const [details, setDetails] = useState(note?.details || '');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Title is required');
    try {
      await update({ id: note.id, title: title.trim(), version: version.trim(), details }).unwrap();
      toast.success('Release note updated');
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
    return undefined;
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit release note">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="Version" placeholder="v1.2.0" value={version} onChange={(e) => setVersion(e.target.value)} />
        <div>
          <label htmlFor="edit-rel-details" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Release notes / overview
          </label>
          <textarea
            id="edit-rel-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-xs focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-gray-800/70"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
