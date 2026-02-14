'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, UserCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ActiveEmployee {
    employee_id: string;
    full_name: string;
    shift_name: string;
    shift_color: string;
    check_in_time: string;
    scheduled_date: string;
}

export function ActiveEmployeesList() {
    const [activeEmployees, setActiveEmployees] = useState<ActiveEmployee[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActiveEmployees();
        // Refresh every 30 seconds
        const interval = setInterval(fetchActiveEmployees, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchActiveEmployees = async () => {
        try {
            const res = await fetch('/api/admin/active-employees');
            if (res.ok) {
                const data = await res.json();
                setActiveEmployees(data.employees || []);
            }
        } catch (error) {
            console.error('Error fetching active employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (timeString: string) => {
        if (!timeString) return '-';
        const date = new Date(timeString);
        return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getWorkDuration = (checkInTime: string) => {
        if (!checkInTime) return '-';
        const checkIn = new Date(checkInTime);
        const now = new Date();
        const diffMs = now.getTime() - checkIn.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}j ${mins}m`;
    };

    return (
        <Card className="border border-border/50 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-green-500/10">
                        <UserCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Karyawan Aktif Saat Ini</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            {activeEmployees.length} karyawan sedang bekerja
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Loading...
                    </div>
                ) : activeEmployees.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Tidak ada karyawan yang sedang check-in</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeEmployees.map((emp) => (
                            <div
                                key={emp.employee_id}
                                className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-colors bg-card"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Users className="h-5 w-5 text-primary" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm truncate">
                                            {emp.full_name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span
                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                                style={{
                                                    backgroundColor: `${emp.shift_color}20`,
                                                    color: emp.shift_color,
                                                }}
                                            >
                                                {emp.shift_name}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="text-right">
                                        <p className="text-muted-foreground text-xs">Check-in</p>
                                        <p className="font-medium flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatTime(emp.check_in_time)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-muted-foreground text-xs">Durasi</p>
                                        <p className="font-medium text-green-600">
                                            {getWorkDuration(emp.check_in_time)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
