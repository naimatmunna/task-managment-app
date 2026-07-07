import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBoardQuery, useReorderTaskMutation } from '@/features/tasks/taskApi.js';
import { toApiFilters } from '@/features/tasks/taskQuery.js';
import { useTaskFilters } from '@/hooks/useTaskFilters.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { TASK_COLUMNS, STATUS_META } from '@/constants';
import PageHeader from '@/components/app/PageHeader.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';
import Button from '@/components/ui/Button.jsx';
import Skeleton from '@/components/ui/Skeleton.jsx';
import TaskCard from '@/components/tasks/TaskCard.jsx';
import TaskFilters from '@/components/tasks/TaskFilters.jsx';
import TaskFormModal from '@/components/tasks/TaskFormModal.jsx';
import TaskDetailPanel from '@/components/tasks/TaskDetailPanel.jsx';
import { cn } from '@/lib/classNames.js';

const normAssignee = (a) => (a ? { name: a.name, avatar: a.avatar?.url } : null);

function SortableCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} assignee={normAssignee(task.assigneeId)} team={task.teamId} onClick={() => onOpen(task.id)} />
    </div>
  );
}

function Column({ column, tasks, onOpen, onAdd }) {
  const { setNodeRef } = useSortable({ id: `col:${column.key}`, data: { column: column.key } });
  const accent = STATUS_META[column.key]?.color;
  return (
    <div className="flex w-[19rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200/60 bg-gray-100/50 dark:border-white/5 dark:bg-gray-900/40">
      <div className="h-1" style={{ backgroundColor: accent }} />
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
          {column.label}
          <span className="rounded-full bg-white px-1.5 text-xs font-medium tabular-nums text-gray-500 shadow-xs ring-1 ring-inset ring-gray-200/70 dark:bg-gray-800 dark:text-gray-400 dark:ring-white/10">
            {tasks.length}
          </span>
        </span>
        <button
          onClick={() => onAdd(column.key)}
          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white hover:text-brand-600 hover:shadow-xs dark:hover:bg-gray-800"
          aria-label={`Add task to ${column.label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <SortableContext id={column.key} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-[60px] flex-1 flex-col gap-2 px-2 pb-3">
          {tasks.map((t) => (
            <SortableCard key={t.id} task={t} onOpen={onOpen} />
          ))}
          {tasks.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-gray-200/80 py-8 text-center text-xs font-medium text-gray-400 dark:border-white/10">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function Board() {
  const { filters, setFilter, setFilters, clear, activeCount } = useTaskFilters();
  const { data: tasks, isLoading } = useBoardQuery(toApiFilters(filters));
  const [reorder] = useReorderTaskMutation();

  const [columns, setColumns] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [addStatus, setAddStatus] = useState(null);
  const [openTaskId, setOpenTaskId] = useState(null);

  // Sync local column state from the server data.
  useEffect(() => {
    const grouped = Object.fromEntries(TASK_COLUMNS.map((c) => [c.key, []]));
    (tasks || []).forEach((t) => {
      (grouped[t.status] ||= []).push(t);
    });
    Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.order - b.order));
    setColumns(grouped);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const taskById = useMemo(() => {
    const map = {};
    Object.values(columns).forEach((arr) => arr.forEach((t) => { map[t.id] = t; }));
    return map;
  }, [columns]);

  const findColumn = (id) => {
    if (id in columns) return id;
    return Object.keys(columns).find((key) => columns[key].some((t) => t.id === id));
  };

  const onDragOver = ({ active, over }) => {
    if (!over) return;
    const from = findColumn(active.id);
    const to = columns[over.id] ? over.id : findColumn(over.id);
    if (!from || !to || from === to) return;

    setColumns((prev) => {
      const fromItems = prev[from];
      const toItems = prev[to];
      const moving = fromItems.find((t) => t.id === active.id);
      if (!moving) return prev;
      const overIndex = toItems.findIndex((t) => t.id === over.id);
      const insertAt = overIndex >= 0 ? overIndex : toItems.length;
      return {
        ...prev,
        [from]: fromItems.filter((t) => t.id !== active.id),
        [to]: [...toItems.slice(0, insertAt), { ...moving, status: to }, ...toItems.slice(insertAt)],
      };
    });
  };

  const onDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const dest = columns[over.id] ? over.id : findColumn(over.id);
    const from = findColumn(active.id);
    if (!dest) return;

    let items = columns[dest];
    const oldIndex = items.findIndex((t) => t.id === active.id);
    const overIndex = items.findIndex((t) => t.id === over.id);
    if (oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex) {
      items = arrayMove(items, oldIndex, overIndex);
      setColumns((prev) => ({ ...prev, [dest]: items }));
    }

    // Compute a float order between the moved card's new neighbours.
    const index = items.findIndex((t) => t.id === active.id);
    const prevOrder = index > 0 ? items[index - 1].order : null;
    const nextOrder = index < items.length - 1 ? items[index + 1].order : null;
    let order;
    if (prevOrder == null && nextOrder == null) order = 1;
    else if (prevOrder == null) order = nextOrder - 1;
    else if (nextOrder == null) order = prevOrder + 1;
    else order = (prevOrder + nextOrder) / 2;

    const task = taskById[active.id];
    if (task && (task.status !== dest || task.order !== order)) {
      try {
        await reorder({ id: active.id, status: dest, order }).unwrap();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Could not move task'));
      }
    }
    void from;
  };

  const activeTask = activeId ? taskById[activeId] : null;

  return (
    <>
      <PageMeta title="Board" />
      <PageHeader
        title="Board"
        description="Drag tasks across columns to update their status."
        actions={
          <Button onClick={() => setAddStatus('todo')}>
            <Plus className="h-4 w-4" /> New task
          </Button>
        }
      />
      <TaskFilters
        filters={filters}
        setFilter={setFilter}
        setFilters={setFilters}
        clear={clear}
        activeCount={activeCount}
        resultCount={tasks?.length}
      />

      {isLoading ? (
        <div className="flex gap-4">
          {TASK_COLUMNS.map((c) => (
            <Skeleton key={c.key} className="h-96 w-72 shrink-0" />
          ))}
        </div>
      ) : (
        <div className={cn('flex gap-4 overflow-x-auto pb-4')}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={({ active }) => setActiveId(active.id)}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            {TASK_COLUMNS.map((column) => (
              <Column
                key={column.key}
                column={column}
                tasks={columns[column.key] || []}
                onOpen={setOpenTaskId}
                onAdd={setAddStatus}
              />
            ))}
            <DragOverlay>
              {activeTask ? (
                <TaskCard task={activeTask} assignee={normAssignee(activeTask.assigneeId)} team={activeTask.teamId} dragging />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {addStatus && <TaskFormModal open onClose={() => setAddStatus(null)} defaultStatus={addStatus} />}
      <TaskDetailPanel taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </>
  );
}
