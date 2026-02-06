import { UsersTable } from '@/components/users/users-table';

export default function InstructorsPage() {
  return (
    <UsersTable
      title="Instructors"
      description="Manage instructor accounts"
      tableTitle="All Instructors"
      mode="instructors"
      addLabel="Add Instructor"
    />
  );
}
