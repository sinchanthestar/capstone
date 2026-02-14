import { AdminLayout } from '@/components/admin/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { queryOne } from '@/lib/db';
import { AttendanceStats } from '@/components/admin/attendance-stats';
import { ActiveEmployeesList } from '@/components/admin/active-employees-list';

export default async function AdminDashboard() {
  let totalEmployeesDisplay: string | number = '--';
  let activeEmployeesDisplay: string | number = '--';
  let activeShiftsDisplay: string | number = '--';
  let todaysAssignmentsDisplay: string | number = '--';
  let presentDisplay: string | number = '--';
  let alfaDisplay: string | number = '--';
  let leaveDisplay: string | number = '--';

  try {
    const emp = await queryOne<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM employees WHERE is_available = true'
    );
    const shifts = await queryOne<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM shifts WHERE is_active = true'
    );
    const assignments = await queryOne<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM schedule_assignments WHERE scheduled_date = CURRENT_DATE"
    );

    totalEmployeesDisplay = emp ? parseInt(emp.count, 10) : 0;
    activeShiftsDisplay = shifts ? parseInt(shifts.count, 10) : 0;
    todaysAssignmentsDisplay = assignments ? parseInt(assignments.count, 10) : 0;

    // Fetch active employees (currently checked-in today)
    // Use Indonesian timezone (UTC+8)
    const now = new Date();
    const indonesiaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const today = indonesiaTime.toISOString().slice(0, 10);

    const activeEmployees = await queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT employee_id)::text as count
       FROM attendance_logs
       WHERE attendance_date = $1 
       AND check_in_time IS NOT NULL 
       AND check_out_time IS NULL`,
      [today]
    );

    activeEmployeesDisplay = activeEmployees ? parseInt(activeEmployees.count, 10) : 0;

    // Fetch attendance statistics for today (using Indonesian timezone)
    const presentRes = await queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT employee_id)::text as count
       FROM attendance_logs
       WHERE attendance_date = $1 AND status = 'APPROVED'`,
      [today]
    );

    const leaveRes = await queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT lr.employee_id)::text as count
       FROM leave_requests lr
       JOIN schedule_assignments sa ON lr.assignment_id = sa.id
       WHERE lr.status = 'APPROVED'
       AND sa.scheduled_date = $1`,
      [today]
    );

    const scheduledRes = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM schedule_assignments
       WHERE scheduled_date = $1`,
      [today]
    );

    const scheduledCount = scheduledRes ? parseInt(scheduledRes.count, 10) : 0;
    const presentCount = presentRes ? parseInt(presentRes.count, 10) : 0;
    const leaveCount = leaveRes ? parseInt(leaveRes.count, 10) : 0;
    const alfaCount = Math.max(0, scheduledCount - presentCount - leaveCount);

    presentDisplay = presentCount;
    alfaDisplay = alfaCount;
    leaveDisplay = leaveCount;
  } catch (err) {
    // If DB not configured or error occurs, leave values as '--'
    // console.error('Admin dashboard counts error', err);
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-lg">Manage your team's schedule efficiently</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Employees"
            value={totalEmployeesDisplay}
            icon={Users}
            color="from-blue-500/10 to-blue-500/5"
            iconColor="text-blue-600"
            trend="+2 this month"
          />

          <StatCard
            title="Active Employees"
            value={activeEmployeesDisplay}
            icon={Users}
            color="from-green-500/10 to-green-500/5"
            iconColor="text-green-600"
            trend="Currently checked-in"
          />

          <StatCard
            title="Active Shifts"
            value={activeShiftsDisplay}
            icon={Clock}
            color="from-purple-500/10 to-purple-500/5"
            iconColor="text-purple-600"
            trend="Last updated today"
          />

          <StatCard
            title="Today's Assignments"
            value={todaysAssignmentsDisplay}
            icon={Calendar}
            color="from-emerald-500/10 to-emerald-500/5"
            iconColor="text-emerald-600"
            trend="Scheduled today"
          />
        </div>

        {/* Attendance Stats Section */}
        <AttendanceStats
          presentCount={typeof presentDisplay === 'number' ? presentDisplay : 0}
          alfaCount={typeof alfaDisplay === 'number' ? alfaDisplay : 0}
          leaveCount={typeof leaveDisplay === 'number' ? leaveDisplay : 0}
          date={new Date().toISOString().slice(0, 10)}
        />

        {/* Active Employees List */}
        <ActiveEmployeesList />

        {/* Quick Start Guide */}
        <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/20">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Quick Start Guide</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Get up and running with these essential steps</p>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                { step: 1, text: 'Create shift types in the Shifts section' },
                { step: 2, text: 'View and manage employees in the Employees section' },
                { step: 3, text: 'Assign shifts to employees in the Schedule section' },
                { step: 4, text: 'Avoid conflicts automatically with our collision detection' },
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-4 group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold group-hover:scale-110 transition-transform">
                    {item.step}
                  </div>
                  <span className="text-sm pt-1">{item.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  iconColor,
  trend,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  iconColor: string;
  trend: string;
}) {
  return (
    <Card className={`group hover:shadow-lg hover:border-primary/50 transition-all duration-300 border border-border/50 overflow-hidden bg-gradient-to-br ${color}`}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="text-3xl font-bold tracking-tight">{value}</div>
        </div>
        <div className={`p-3 rounded-lg bg-white/50 group-hover:bg-white/70 transition-colors`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{trend}</p>
      </CardContent>
    </Card>
  );
}
