import { useState } from 'react';
import toast from 'react-hot-toast';
import { useGetUsersQuery, useDeleteUserMutation } from '@/features/users/usersApi.js';
import { useDebounce } from '@/hooks/useDebounce.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { formatDate } from '@/helpers/format.js';
import Table from '@/components/ui/Table.jsx';
import Pagination from '@/components/ui/Pagination.jsx';
import SearchInput from '@/components/ui/SearchInput.jsx';
import Button from '@/components/ui/Button.jsx';
import ConfirmDialog from '@/components/ui/ConfirmDialog.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [toDelete, setToDelete] = useState(null);

  const { data, isLoading, isFetching } = useGetUsersQuery({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
  });
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const users = data?.data ?? [];
  const totalPages = data?.meta?.pagination?.totalPages ?? 1;

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'roles', header: 'Roles', render: (u) => u.roles?.join(', ') },
    { key: 'createdAt', header: 'Joined', render: (u) => formatDate(u.createdAt) },
    {
      key: 'actions',
      header: '',
      render: (u) => (
        <Button size="sm" variant="danger" onClick={() => setToDelete(u)}>
          Delete
        </Button>
      ),
    },
  ];

  const confirmDelete = async () => {
    try {
      await deleteUser(toDelete.id).unwrap();
      toast.success('User deleted');
      setToDelete(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <PageMeta title="Users" />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
      </div>
      <Table columns={columns} data={users} isLoading={isLoading || isFetching} />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Delete user?"
        message={`This will permanently remove ${toDelete?.name}.`}
        confirmLabel="Delete"
      />
    </>
  );
}
