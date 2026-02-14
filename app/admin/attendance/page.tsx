'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AttendanceLog {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  attendance_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: 'PENDING' | 'LATE' | 'APPROVED' | 'REJECTED';
  notes: string | null;
  late_minutes?: number;
  shift_name?: string;
  shift_start_time?: string;
}

export default function AttendancePage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/admin/attendance?status=PENDING');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        toast.error('Gagal memuat data kehadiran');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Error memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (log: AttendanceLog) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/attendance/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId: log.id }),
      });

      if (response.ok) {
        toast.success(`Kehadiran ${log.full_name} disetujui`);
        fetchLogs();
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menyetujui');
      }
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Error menyetujui kehadiran');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClick = (log: AttendanceLog) => {
    setSelectedLog(log);
    setRejectNotes('');
    setRejectDialog(true);
  };

  const handleReject = async () => {
    if (!selectedLog) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/attendance/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId: selectedLog.id, notes: rejectNotes }),
      });

      if (response.ok) {
        toast.success(`Kehadiran ${selectedLog.full_name} ditolak`);
        setRejectDialog(false);
        fetchLogs();
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menolak');
      }
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Error menolak kehadiran');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-8">Memuat...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Persetujuan Kehadiran</h1>

        <Card>
          <CardHeader>
            <CardTitle>Kehadiran Menunggu Persetujuan</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tidak ada data kehadiran yang menunggu persetujuan
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Karyawan</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Masuk</TableHead>
                      <TableHead>Pulang</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.full_name}</TableCell>
                        <TableCell>
                          {format(new Date(log.attendance_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {log.check_in_at
                            ? format(new Date(log.check_in_at), 'HH:mm')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {log.check_out_at
                            ? format(new Date(log.check_out_at), 'HH:mm')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {log.status === 'LATE' ? (
                            <div className="flex flex-col gap-1">
                              <Badge className="bg-orange-500 text-white">TERLAMBAT</Badge>
                              {log.late_minutes && (
                                <span className="text-xs text-orange-600">
                                  {log.late_minutes} menit
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline">{log.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(log)}
                            disabled={actionLoading}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectClick(log)}
                            disabled={actionLoading}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Tolak
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Kehadiran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedLog && (
              <div className="text-sm text-muted-foreground">
                <p>Karyawan: <strong>{selectedLog.full_name}</strong></p>
                <p>Tanggal: <strong>{format(new Date(selectedLog.attendance_date), 'dd MMM yyyy')}</strong></p>
              </div>
            )}
            <div>
              <Label htmlFor="reject-notes">Catatan Penolakan (Opsional)</Label>
              <Textarea
                id="reject-notes"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Alasan penolakan..."
                className="mt-2"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setRejectDialog(false)}
                disabled={actionLoading}
              >
                Batal
              </Button>
              <Button
                onClick={handleReject}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? 'Menolak...' : 'Tolak'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
