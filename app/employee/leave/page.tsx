'use client';

import React, { useState, useEffect } from 'react';
import { EmployeeLayout } from '@/components/employee/employee-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, FileText, Send, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';

interface Schedule {
    id: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    scheduled_date: string;
    color: string;
}

interface LeaveRequest {
    id: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    admin_notes?: string;
    created_at: string;
    scheduled_date: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    color: string;
    approved_by_name?: string;
}

export default function LeavePage() {
    const [loading, setLoading] = useState(true);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [upcomingSchedules, setUpcomingSchedules] = useState<Schedule[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<string>('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch leave requests
            const leaveRes = await fetch('/api/leave-requests');
            if (leaveRes.ok) {
                const leaveData = await leaveRes.json();
                setLeaveRequests(leaveData.leaveRequests || []);
            }

            // Fetch current user details
            const sessionRes = await fetch('/api/auth/session');
            if (!sessionRes.ok) throw new Error('Gagal memuat sesi');
            const session = await sessionRes.json();

            // Fetch employees list
            const empRes = await fetch('/api/employees');
            if (!empRes.ok) throw new Error('Gagal memuat data karyawan');

            const empJson = await empRes.json();
            const currentEmployee = empJson.employees?.find((e: any) => e.user_id === session.user.id);

            if (!currentEmployee) {
                toast.error('Profil karyawan tidak ditemukan. Hubungi admin.');
                return;
            }

            const today = new Date();
            const startDate = format(today, 'yyyy-MM-dd');
            const endDate = format(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

            const schedRes = await fetch(`/api/assignments?startDate=${startDate}&endDate=${endDate}&employeeId=${currentEmployee.id}`);
            if (schedRes.ok) {
                const schedData = await schedRes.json();
                const assignments = schedData.assignments || [];

                // Filter out assignments that are already pending leave approval
                // Note: ideally this should be done in backend or we check leaveRequests here
                setUpcomingSchedules(assignments.map((a: any) => ({
                    id: a.id,
                    shift_name: a.shift_name,
                    start_time: a.start_time,
                    end_time: a.end_time,
                    scheduled_date: a.scheduled_date,
                    color: a.color || '#3b82f6'
                })));

                if (assignments.length === 0) {
                    // Optional info toast
                    // toast.info('Tidak ada jadwal kerja dalam 30 hari ke depan');
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Terjadi kesalahan saat memuat data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedSchedule || !reason.trim()) {
            toast.error('Pilih jadwal dan isi alasan');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/leave-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assignmentId: selectedSchedule,
                    reason: reason.trim()
                })
            });

            console.log('Response status:', res.status);
            const textResponse = await res.text();
            console.log('Response text:', textResponse);

            let data = {};
            if (textResponse && textResponse.trim()) {
                try {
                    data = JSON.parse(textResponse);
                } catch (e) {
                    console.error('Failed to parse JSON:', e);
                    toast.error(`Server error (${res.status}): Respons tidak valid dari server`);
                    return;
                }
            }

            if (res.ok) {
                toast.success('Pengajuan izin berhasil dikirim');
                setOpenDialog(false);
                setSelectedSchedule('');
                setReason('');
                fetchData();
            } else {
                console.error('Error response:', data);
                // Handle various error cases
                let errorMessage = 'Gagal mengirim pengajuan izin';
                
                if (data && typeof data === 'object') {
                    if (data.error) {
                        errorMessage = data.error;
                    } else if (data.message) {
                        errorMessage = data.message;
                    } else if (Object.keys(data).length === 0) {
                        errorMessage = `Server error (${res.status}): Tidak ada respons dari server`;
                    }
                }

                toast.error(errorMessage);
            }
        } catch (error) {
            console.error('Submission error:', error);
            toast.error('Terjadi kesalahan jaringan atau server.');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">⏳ Menunggu</Badge>;
            case 'APPROVED':
                return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">✅ Disetujui</Badge>;
            case 'REJECTED':
                return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">❌ Ditolak</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <EmployeeLayout>
                <div className="flex items-center justify-center p-8">Memuat...</div>
            </EmployeeLayout>
        );
    }

    return (
        <EmployeeLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Pengajuan Izin</h1>
                        <p className="text-muted-foreground">Ajukan izin untuk jadwal kerja Anda</p>
                    </div>

                    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                        <DialogTrigger asChild>
                            <Button>
                                <Send className="mr-2 h-4 w-4" />
                                Ajukan Izin
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Ajukan Izin</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div>
                                    <Label>Pilih Jadwal</Label>
                                    <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
                                        <SelectTrigger className="mt-2">
                                            <SelectValue placeholder="Pilih jadwal yang ingin diizinkan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {upcomingSchedules.length === 0 ? (
                                                <div className="p-2 text-sm text-muted-foreground">Tidak ada jadwal</div>
                                            ) : (
                                                upcomingSchedules.map((schedule) => (
                                                    <SelectItem key={schedule.id} value={schedule.id}>
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="w-3 h-3 rounded-full"
                                                                style={{ backgroundColor: schedule.color }}
                                                            />
                                                            <span>
                                                                {format(new Date(schedule.scheduled_date), 'dd MMM yyyy', { locale: idLocale })} - {schedule.shift_name} ({schedule.start_time} - {schedule.end_time})
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="reason">Alasan Izin</Label>
                                    <Textarea
                                        id="reason"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Tuliskan alasan Anda meminta izin..."
                                        className="mt-2"
                                        rows={4}
                                    />
                                </div>

                                <Button
                                    onClick={handleSubmit}
                                    className="w-full"
                                    disabled={submitting || !selectedSchedule || !reason.trim()}
                                >
                                    {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Leave Requests List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Riwayat Pengajuan Izin
                        </CardTitle>
                        <CardDescription>Daftar pengajuan izin Anda</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {leaveRequests.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>Belum ada pengajuan izin</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {leaveRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">
                                                            {format(new Date(request.scheduled_date), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
                                                        </span>
                                                    </div>
                                                    {getStatusBadge(request.status)}
                                                </div>

                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                                    <span
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: request.color }}
                                                    />
                                                    <span>{request.shift_name}</span>
                                                    <Clock className="h-4 w-4 ml-2" />
                                                    <span>{request.start_time} - {request.end_time}</span>
                                                </div>

                                                <div className="text-sm">
                                                    <strong>Alasan:</strong> {request.reason}
                                                </div>

                                                {request.admin_notes && (
                                                    <div className="text-sm mt-2 p-2 bg-muted rounded">
                                                        <strong>Catatan Admin:</strong> {request.admin_notes}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </EmployeeLayout>
    );
}
