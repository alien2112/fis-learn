import { UsersTable } from '@/components/users/users-table';

export default function StudentsPage() {
  return (
    <UsersTable
      title="Students"
      description="Manage student accounts"
      tableTitle="All Students"
      mode="students"
      addLabel="Add Student"
    />
  );
}
