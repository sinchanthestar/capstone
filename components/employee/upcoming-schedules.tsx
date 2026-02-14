'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

type UpcomingSchedule = {
  id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  date: string;
  color: string;
  status: 'pending' | 'confirmed';
};

export function UpcomingSchedules() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<UpcomingSchedule[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpcomingSchedules = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get current user session and employee ID
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
          throw new Error('Employee record not found');
        }

        // Build date range for next 7 days
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const startDate = format(tomorrow, 'yyyy-MM-dd');
        const endDate = format(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

        // Fetch assignments for this employee in the next 7 days
        const params = new URLSearchParams({
          startDate,
          endDate,
          employeeId: currentEmployee.id,
        });

        const res = await fetch(`/api/assignments?${params}`);
        if (!res.ok) throw new Error('Failed to fetch assignments');

        const json = await res.json();
        const assignments = json.assignments || [];

        // Map to upcoming schedules format
        const upcomingList = assignments.map((a: any) => ({
          id: a.id,
          shift_name: a.shift_name,
          start_time: a.start_time,
          end_time: a.end_time,
          date: a.scheduled_date,
          color: a.color || '#3b82f6',
          status: a.is_confirmed ? 'confirmed' : 'pending'
        }));

        setSchedules(upcomingList);
      } catch (err) {
        console.error('Error fetching upcoming schedules:', err);
        setError('Gagal memuat jadwal mendatang');
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingSchedules();
  }, []);

  if (loading) {
    return (
      <Card className="border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Jadwal Mendatang
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="inline-flex gap-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Jadwal Mendatang
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (schedules.length === 0) {
    return (
      <Card className="border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Jadwal Mendatang
          </CardTitle>
          <CardDescription>Tidak ada jadwal 7 hari ke depan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Hubungi manajer untuk mengetahui jadwal Anda.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50 hover:shadow-lg transition-shadow">
      <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary"></div>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Jadwal Mendatang
            </CardTitle>
            <CardDescription>7 hari ke depan</CardDescription>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            {schedules.length} jadwal
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {schedules.map((schedule) => {
            const scheduleDate = parseISO(schedule.date);
            const formattedDate = format(scheduleDate, 'EEEE, dd MMMM yyyy', { locale: idLocale });
            const dayOfWeek = format(scheduleDate, 'EEE', { locale: idLocale });

            return (
              <div
                key={schedule.id}
                className="group border border-border/50 rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-all duration-200 bg-gradient-to-r from-transparent via-transparent to-transparent hover:from-primary/5 hover:to-accent/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex flex-col items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 p-2 min-w-fit">
                        <span className="text-xs font-bold text-primary uppercase">{dayOfWeek}</span>
                        <span className="text-lg font-bold text-primary">{format(scheduleDate, 'dd')}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-muted-foreground">
                          {format(scheduleDate, 'MMMM', { locale: idLocale })}
                        </p>
                        <p className="text-xs text-muted-foreground">{formattedDate}</p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: schedule.color }}
                          />
                          {schedule.shift_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{schedule.start_time} - {schedule.end_time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    {schedule.status === 'confirmed' ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                        ✅ Terkonfirmasi
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">
                        ⏳ Menunggu
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>ℹ️ Info:</strong> Status <strong>Pending</strong> berarti jadwal menunggu konfirmasi dari manajer Anda.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
