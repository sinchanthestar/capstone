'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type AttendanceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NONE';

type AttendanceData = {
  id?: string;
  attendance_date?: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
  status?: AttendanceStatus;
  notes?: string | null;
};

type TodaySchedule = {
  id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  color: string;
};

function fmtTime(ts?: string | null) {
  if (!ts) return '-';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
}

function badgeVariant(status: AttendanceStatus) {
  if (status === 'APPROVED') return 'default';
  if (status === 'PENDING') return 'outline';
  if (status === 'REJECTED') return 'destructive' as any;
  return 'secondary' as any;
}

export function AttendanceCard() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [data, setData] = useState<AttendanceData>({ status: 'NONE' });
  const [todaySchedule, setTodaySchedule] = useState<TodaySchedule | null>(null);

  const fetchToday = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees/attendance/today');
      if (res.ok) {
        const json = await res.json();
        setData(json.attendance ?? { status: 'NONE' });
      } else {
        setData({ status: 'NONE' });
      }
    } catch {
      setData({ status: 'NONE' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaySchedule = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Get current user session
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) throw new Error('Failed to get session');

      const session = await sessionRes.json();
      if (!session || !session.user) {
        throw new Error('No user session');
      }

      // Fetch employee record to get employee_id
      const empRes = await fetch('/api/employees');
      if (!empRes.ok) throw new Error('Failed to fetch employees');

      const empJson = await empRes.json();
      const employees = empJson.employees || [];
      const currentEmployee = employees.find((e: any) => e.user_id === session.user.id);

      if (!currentEmployee) {
        setTodaySchedule(null);
        return;
      }

      // Fetch today's assignment for this employee
      const params = new URLSearchParams({
        date: today,
        employeeId: currentEmployee.id,
      });

      const res = await fetch(`/api/assignments?${params}`);
      if (!res.ok) throw new Error('Failed to fetch assignments');

      const json = await res.json();
      const assignments = json.assignments || [];

      // Get the first assignment (should be only one per day per employee)
      if (assignments.length > 0) {
        const assignment = assignments[0];
        setTodaySchedule({
          id: assignment.id,
          shift_name: assignment.shift_name,
          start_time: assignment.start_time,
          end_time: assignment.end_time,
          color: assignment.color || '#3b82f6',
        });
      } else {
        setTodaySchedule(null);
      }
    } catch (error) {
      console.error('Error fetching today schedule:', error);
      setTodaySchedule(null);
    }
  };

  useEffect(() => {
    fetchToday();
    fetchTodaySchedule();
  }, []);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/employees/attendance/check-in', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Gagal check-in');
        return;
      }
      toast.success('Check-in berhasil (menunggu konfirmasi admin)');
      await fetchToday();
    } catch {
      toast.error('Error check-in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/employees/attendance/check-out', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Gagal check-out');
        return;
      }
      toast.success('Check-out berhasil (menunggu konfirmasi admin)');
      await fetchToday();
    } catch {
      toast.error('Error check-out');
    } finally {
      setActionLoading(false);
    }
  };

  const status: AttendanceStatus = (data.status as AttendanceStatus) || 'NONE';

  // Only allow check-in/check-out if there's a schedule for today
  const hasScheduleToday = todaySchedule !== null;
  const canCheckIn = !loading && !actionLoading && !data.check_in_at && hasScheduleToday;
  const canCheckOut = !loading && !actionLoading && !!data.check_in_at && !data.check_out_at && hasScheduleToday;

  return (
    <Card className="overflow-hidden border border-border/50 hover:shadow-lg transition-shadow">
      <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary"></div>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">Absensi Hari Ini</CardTitle>
            <CardDescription>Kelola check-in dan check-out Anda (menunggu persetujuan admin)</CardDescription>
          </div>
          <div className="text-right">
            <Badge
              variant={badgeVariant(status)}
              className={`${status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' :
                  status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                    status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                } px-3 py-1 text-sm font-semibold`}
            >
              {status === 'NONE' ? '⏳ Belum absen' : status === 'APPROVED' ? '✅ Disetujui' : status === 'PENDING' ? '⏳ Menunggu' : '❌ Ditolak'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="inline-flex gap-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        ) : (
          <>
            {!hasScheduleToday ? (
              <Alert className="border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-700 dark:text-amber-300 font-medium">
                  ⚠️ Tidak ada jadwal kerja untuk hari ini. Anda tidak bisa melakukan absensi.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Today's Schedule Info */}
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">Jadwal Hari Ini</p>
                          <p className="text-lg font-bold text-primary">{todaySchedule.shift_name}</p>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: todaySchedule.color }}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{todaySchedule.start_time} - {todaySchedule.end_time}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {status === 'REJECTED' && data.notes ? (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  <strong>Direkomendasikan:</strong> {data.notes}
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/50 p-4 bg-gradient-to-br from-blue-50/50 to-blue-50/30 dark:from-blue-950/20 dark:to-blue-950/10 hover:shadow-md transition-shadow">
                <div className="text-sm text-muted-foreground font-medium mb-2">🔵 Check-in</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {fmtTime(data.check_in_at)}
                </div>
                <div className="text-xs text-muted-foreground mt-2">Waktu masuk kerja</div>
              </div>

              <div className="rounded-xl border border-border/50 p-4 bg-gradient-to-br from-orange-50/50 to-orange-50/30 dark:from-orange-950/20 dark:to-orange-950/10 hover:shadow-md transition-shadow">
                <div className="text-sm text-muted-foreground font-medium mb-2">🟠 Check-out</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {fmtTime(data.check_out_at)}
                </div>
                <div className="text-xs text-muted-foreground mt-2">Waktu pulang kerja</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleCheckIn}
                disabled={!canCheckIn}
                className={canCheckIn ? 'bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0' : ''}
                size="lg"
              >
                {actionLoading ? '⏳ Processing...' : '🔵 Absen Masuk'}
              </Button>
              <Button
                onClick={handleCheckOut}
                disabled={!canCheckOut}
                variant="outline"
                size="lg"
              >
                {actionLoading ? '⏳ Processing...' : '🟠 Absen Pulang'}
              </Button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>💡 Tips:</strong> Setelah Anda absen, status akan <strong>PENDING</strong> sampai admin mengonfirmasi kehadiran Anda.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
