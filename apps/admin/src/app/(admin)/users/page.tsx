import { UsersTable } from '@/components/users/users-table';

export default function UsersPage() {
  return (
    <UsersTable
      title="Users"
      description="Manage all platform users"
      tableTitle="All Users"
      mode="all"
      addLabel="Add User"
    />
  );
}
