import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  MeasuringStrategy,
  pointerWithin,
  rectIntersection,
  closestCenter,
  getFirstCollision,
  defaultDropAnimationSideEffects,
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

// Keep droppables measured continuously so cross-column / empty-column drops
// stay reliable as the layout shifts mid-drag.
const measuring = { droppable: { strategy: MeasuringStrategy.Always } };

// Quick, eased settle when a card is dropped — keeps the board feeling snappy.
const dropAnimation = {
  duration: 180,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.4' } },
  }),
};

function SortableCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        assignee={normAssignee(task.assigneeId)}
        team={task.teamId}
        onClick={() => onOpen(task.id)}
      />
    </div>
  );
}

function Column({ column, tasks, onOpen, onAdd }) {
  // The droppable id IS the status key, so hovering the column body/empty area
  // resolves straight to the column.
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  const accent = STATUS_META[column.key]?.color;
  const items = useMemo(() => tasks.map((t) => t.id), [tasks]);
  return (
    <div
      className={cn(
        'flex w-[19rem] shrink-0 flex-col overflow-hidden rounded-2xl border bg-gray-100/50 transition-colors duration-150 dark:bg-gray-900/40',
        isOver
          ? 'border-brand-400 ring-2 ring-brand-500/20 dark:border-brand-500/50'
          : 'border-gray-200/60 dark:border-white/5',
      )}
    >
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
      {/* setNodeRef is on the scroll body so the whole column area is a drop target. */}
      <SortableContext id={column.key} items={items} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-[80px] flex-1 flex-col gap-2 px-2 pb-3">
          {tasks.map((t) => (
            <SortableCard key={t.id} task={t} onOpen={onOpen} />
          ))}
          {tasks.length === 0 && (
            <div
              className={cn(
                'flex-1 rounded-xl border-2 border-dashed py-8 text-center text-xs font-medium transition-colors',
                isOver
                  ? 'border-brand-400 text-brand-500 dark:border-brand-500/50'
                  : 'border-gray-200/80 text-gray-400 dark:border-white/10',
              )}
            >
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

  const lastOverId = useRef(null);
  const recentlyMovedToNewColumn = useRef(false);
  const dragStart = useRef(null); // { status, order } captured at drag start

  // Sync local column state from the server data.
  useEffect(() => {
    const grouped = Object.fromEntries(TASK_COLUMNS.map((c) => [c.key, []]));
    (tasks || []).forEach((t) => {
      (grouped[t.status] ||= []).push(t);
    });
    Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.order - b.order));
    setColumns(grouped);
  }, [tasks]);

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewColumn.current = false;
    });
  }, [columns]);

  const sensors = useSensors(
    // Mouse (desktop): tiny distance so drag engages fast; a plain click still
    // opens the task. Touch: long-press to drag so scrolling keeps working.
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const taskById = useMemo(() => {
    const map = {};
    Object.values(columns).forEach((arr) => arr.forEach((t) => { map[t.id] = t; }));
    return map;
  }, [columns]);

  // Resolve any droppable id (a column key OR a task id) to its column key.
  const findColumn = useCallback(
    (id) => {
      if (id == null) return null;
      if (id in columns) return id; // over the column body / empty area
      return Object.keys(columns).find((key) => columns[key].some((t) => t.id === id)) ?? null;
    },
    [columns],
  );

  // Pointer-first collision detection with sensible fallbacks — always yields a
  // valid drop target, including empty columns.
  const collisionDetection = useCallback(
    (args) => {
      const pointer = pointerWithin(args);
      const intersections = pointer.length > 0 ? pointer : rectIntersection(args);
      let overId = getFirstCollision(intersections, 'id');

      if (overId != null) {
        // If over a column container, narrow to the closest card inside it.
        if (overId in columns) {
          const ids = columns[overId].map((t) => t.id);
          if (ids.length > 0) {
            const closest = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (c) => c.id !== overId && ids.includes(c.id),
              ),
            })[0];
            if (closest) overId = closest.id;
          }
        }
        lastOverId.current = overId;
        return [{ id: overId }];
      }

      if (recentlyMovedToNewColumn.current) lastOverId.current = activeId;
      return lastOverId.current != null ? [{ id: lastOverId.current }] : [];
    },
    [activeId, columns],
  );

  const onDragStart = useCallback(
    ({ active }) => {
      setActiveId(active.id);
      const t = taskById[active.id];
      dragStart.current = t ? { status: t.status, order: t.order } : null;
    },
    [taskById],
  );

  const onDragOver = useCallback(
    ({ active, over }) => {
      const overId = over?.id;
      if (overId == null) return;
      const from = findColumn(active.id);
      const to = findColumn(overId);
      if (!from || !to || from === to) return;

      setColumns((prev) => {
        const fromItems = prev[from];
        const toItems = prev[to];
        const activeIndex = fromItems.findIndex((t) => t.id === active.id);
        if (activeIndex === -1) return prev;
        const moving = fromItems[activeIndex];

        let newIndex;
        if (overId in prev) {
          newIndex = toItems.length; // dropped over the empty column body
        } else {
          const overIndex = toItems.findIndex((t) => t.id === overId);
          const below =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top > over.rect.top + over.rect.height / 2;
          newIndex = overIndex >= 0 ? overIndex + (below ? 1 : 0) : toItems.length;
        }

        recentlyMovedToNewColumn.current = true;
        return {
          ...prev,
          [from]: fromItems.filter((t) => t.id !== active.id),
          [to]: [
            ...toItems.slice(0, newIndex),
            { ...moving, status: to },
            ...toItems.slice(newIndex),
          ],
        };
      });
    },
    [findColumn],
  );

  const onDragEnd = useCallback(
    async ({ active, over }) => {
      setActiveId(null);
      const start = dragStart.current;
      dragStart.current = null;

      const overId = over?.id;
      if (overId == null) return;
      const dest = findColumn(overId);
      if (!dest) return;

      // Finalise ordering within the destination column.
      let items = columns[dest];
      const activeIndex = items.findIndex((t) => t.id === active.id);
      if (activeIndex === -1) return;
      const overIndex = items.findIndex((t) => t.id === overId);
      if (overIndex !== -1 && activeIndex !== overIndex) {
        items = arrayMove(items, activeIndex, overIndex);
        setColumns((prev) => ({ ...prev, [dest]: items }));
      }

      // Float order strictly between the new neighbours.
      const index = items.findIndex((t) => t.id === active.id);
      const prevOrder = index > 0 ? items[index - 1].order : null;
      const nextOrder = index < items.length - 1 ? items[index + 1].order : null;
      let order;
      if (prevOrder == null && nextOrder == null) order = 1;
      else if (prevOrder == null) order = nextOrder - 1;
      else if (nextOrder == null) order = prevOrder + 1;
      else order = (prevOrder + nextOrder) / 2;

      // Skip the network call if nothing actually changed.
      if (start && start.status === dest && start.order === order) return;

      try {
        await reorder({ id: active.id, status: dest, order }).unwrap();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Could not move task'));
      }
    },
    [findColumn, columns, reorder],
  );

  const onDragCancel = useCallback(() => {
    setActiveId(null);
    dragStart.current = null;
  }, []);

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
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          measuring={measuring}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {TASK_COLUMNS.map((column) => (
              <Column
                key={column.key}
                column={column}
                tasks={columns[column.key] || []}
                onOpen={setOpenTaskId}
                onAdd={setAddStatus}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={dropAnimation}>
            {activeTask ? (
              <div className="rotate-2 cursor-grabbing">
                <TaskCard
                  task={activeTask}
                  assignee={normAssignee(activeTask.assigneeId)}
                  team={activeTask.teamId}
                  dragging
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {addStatus && <TaskFormModal open onClose={() => setAddStatus(null)} defaultStatus={addStatus} />}
      <TaskDetailPanel taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </>
  );
}
