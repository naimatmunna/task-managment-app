import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { connectSocket, disconnectSocket } from '@/lib/socket.js';
import { taskApi } from '@/features/tasks/taskApi.js';
import { setOnline, clearPresence } from '@/features/presence/presenceSlice.js';

/**
 * Opens the realtime connection for the authenticated session and keeps client
 * state in sync:
 *   • task:created / task:updated / task:deleted → refetch task queries so every
 *     open board/list reflects the change (e.g. a status move) immediately.
 *   • presence:update → track which members are online per org.
 * Mount once, high in the authenticated tree (see DashboardLayout).
 */
export function useRealtime() {
  const dispatch = useDispatch();

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return undefined; // realtime disabled (no VITE_SOCKET_URL)

    const refetchTasks = () => dispatch(taskApi.util.invalidateTags(['Task']));
    const onPresence = (payload) => dispatch(setOnline(payload));

    socket.on('task:created', refetchTasks);
    socket.on('task:updated', refetchTasks);
    socket.on('task:deleted', refetchTasks);
    socket.on('presence:update', onPresence);

    return () => {
      socket.off('task:created', refetchTasks);
      socket.off('task:updated', refetchTasks);
      socket.off('task:deleted', refetchTasks);
      socket.off('presence:update', onPresence);
      dispatch(clearPresence());
      disconnectSocket();
    };
  }, [dispatch]);
}
