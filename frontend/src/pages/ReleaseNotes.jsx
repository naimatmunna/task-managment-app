import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Plus,
  Rocket,
  Eye,
  Pencil,
  RefreshCw,
  Trash2,
  Tag,
  Calendar,
  FileText,
  FileType2,
} from 'lucide-react';
import {
  useReleaseNotesQuery,
  useRegenerateReleaseNoteMutation,
  useDeleteReleaseNoteMutation,
} from '@/features/releases/releaseApi.js';
import { downloadReleaseExport } from '@/features/releases/releaseExport.js';
import { useOrg } from '@/hooks/useOrg.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import PageHeader from '@/components/app/PageHeader.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';
import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Skeleton from '@/components/ui/Skeleton.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import GenerateReleaseModal from '@/components/releases/GenerateReleaseModal.jsx';
import EditReleaseModal from '@/components/releases/EditReleaseModal.jsx';
import ReleaseViewPanel from '@/components/releases/ReleaseViewPanel.jsx';

const fmt = (d) => (d ? format(new Date(d), 'MMM d, yyyy') : '—');

function IconButton({ icon: Icon, label, onClick, danger, className }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 ${danger ? 'hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-900/20' : ''} ${className || ''}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default function ReleaseNotes() {
  const { data: notes, isLoading } = useReleaseNotesQuery();
  const { canManage } = useOrg();
  const [regenerate] = useRegenerateReleaseNoteMutation();
  const [deleteNote] = useDeleteReleaseNoteMutation();

  const [genOpen, setGenOpen] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [viewId, setViewId] = useState(null);

  const onRegenerate = async (note) => {
    try {
      await regenerate(note.id).unwrap();
      toast.success('Release note regenerated');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const onDelete = async (note) => {
    if (!window.confirm(`Delete "${note.title}"? This cannot be undone.`)) return;
    try {
      await deleteNote(note.id).unwrap();
      toast.success('Release note deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const onDownload = async (note, kind) => {
    try {
      await downloadReleaseExport(note.id, kind, `${note.title}${note.version ? ` ${note.version}` : ''}`);
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <>
      <PageMeta title="Release notes" />
      <PageHeader
        title="Release notes"
        description="Snapshot what shipped in a date range and share it as a polished document."
        actions={
          canManage && (
            <Button onClick={() => setGenOpen(true)}>
              <Plus className="h-4 w-4" /> Generate
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !notes?.length ? (
        <EmptyState
          icon={Rocket}
          title="No release notes yet"
          description="Generate your first release note to summarize completed work over a period."
          action={
            canManage && (
              <Button onClick={() => setGenOpen(true)}>
                <Plus className="h-4 w-4" /> Generate release note
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <button onClick={() => setViewId(note.id)} className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-gray-900 dark:text-gray-100">{note.title}</h3>
                  {note.version && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-500/25 dark:text-brand-300">
                      <Tag className="h-3 w-3" /> {note.version}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {fmt(note.dateFrom)} – {fmt(note.dateTo)}
                  </span>
                  <span className="tabular-nums">{note.summary?.total ?? note.tasks?.length ?? 0} tasks</span>
                  <span>Created {fmt(note.createdAt)}</span>
                </div>
              </button>

              <div className="flex items-center gap-0.5">
                <IconButton icon={Eye} label="View" onClick={() => setViewId(note.id)} />
                <IconButton icon={FileText} label="Download PDF" onClick={() => onDownload(note, 'pdf')} />
                <IconButton icon={FileType2} label="Download Word" onClick={() => onDownload(note, 'docx')} />
                {canManage && (
                  <>
                    <IconButton icon={Pencil} label="Edit" onClick={() => setEditNote(note)} />
                    <IconButton icon={RefreshCw} label="Regenerate" onClick={() => onRegenerate(note)} />
                    <IconButton icon={Trash2} label="Delete" danger onClick={() => onDelete(note)} />
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {genOpen && <GenerateReleaseModal open onClose={() => setGenOpen(false)} onCreated={(id) => setViewId(id)} />}
      {editNote && <EditReleaseModal open note={editNote} onClose={() => setEditNote(null)} />}
      <ReleaseViewPanel noteId={viewId} onClose={() => setViewId(null)} />
    </>
  );
}
