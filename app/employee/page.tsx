import { EmployeeLayout } from '@/components/employee/employee-layout';
import { AttendanceCard } from '@/components/employee/attendance-card';
import { UpcomingSchedules } from '@/components/employee/upcoming-schedules';

export default function EmployeePage() {
  return (
    <EmployeeLayout>
      <div className="space-y-6">
        <AttendanceCard />
        <UpcomingSchedules />
      </div>
    </EmployeeLayout>
  );
}

