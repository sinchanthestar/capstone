'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Users, Calendar, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';

interface LeaveRequest {
    id: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    admin_notes?: string;
    created_at: string;
    assignment_id: string;
    scheduled_date: string;
    shift_id: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    color: string;
    employee_id: string;
    employee_name: string;
    employee_email: string;
    approved_by_name?: string;
}

interface AvailableEmployee {
    id: string;
    full_name: string;
    email: string;
    department?: string;
    position?: string;
}

export default function LeaveRequestsPage() {
    const [loading, setLoading] = useState(true);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [actionLoading, setActionLoading] = useState(false);

    // Approve dialog state
    const [approveDialog, setApproveDialog] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
    const [availableEmployees, setAvailableEmployees] = useState<AvailableEmployee[]>([]);
    const [loadingReplacements, setLoadingReplacements] = useState(false);
    const [selectedReplacement, setSelectedReplacement] = useState<string>('');
    const [approveNotes, setApproveNotes] = useState('');

    // Reject dialog state
    const [rejectDialog, setRejectDialog] = useState(false);
    const [rejectNotes, setRejectNotes] = useState('');

    useEffect(() => {
        fetchLeaveRequests();
    }, []);

    const fetchLeaveRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/leave-requests?status=PENDING');
            if (res.ok) {
                const data = await res.json();
                setLeaveRequests(data.leaveRequests || []);
            } else {
                toast.error('Gagal memuat data pengajuan');
            }
        } catch (error) {
            toast.error('Error memuat data');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveClick = async (request: LeaveRequest) => {
        setSelectedRequest(request);
        setSelectedReplacement('');
        setApproveNotes('');
        setApproveDialog(true);

        // Fetch available replacements
        setLoadingReplacements(true);
        try {
            const res = await fetch(`/api/admin/available-replacements?date=${request.scheduled_date}&excludeEmployeeId=${request.employee_id}`);
            if (res.ok) {
                const data = await res.json();
                setAvailableEmployees(data.availableEmployees || []);
            }
        } catch (error) {
            console.error('Error fetching replacements:', error);
        } finally {
            setLoadingReplacements(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedRequest || !selectedReplacement) {
            toast.error('Pilih karyawan pengganti');
            return;
        }

        setActionLoading(true);
        try {
            console.log('[Admin LeaveRequests] Approving leave request:', {
                leaveRequestId: selectedRequest.id,
                replacementEmployeeId: selectedReplacement,
                adminNotes: approveNotes
            });

            const res = await fetch('/api/admin/leave-requests/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leaveRequestId: selectedRequest.id,
                    replacementEmployeeId: selectedReplacement,
                    adminNotes: approveNotes
                })
            });

            console.log('[Admin LeaveRequests] Approval response status:', res.status);
            const textResponse = await res.text();
            console.log('[Admin LeaveRequests] Approval response text:', textResponse);

            let data = {};
            if (textResponse && textResponse.trim()) {
                try {
                    data = JSON.parse(textResponse);
                } catch (e) {
                    console.error('[Admin LeaveRequests] Failed to parse response:', e);
                    toast.error(`Server error (${res.status}): Respons tidak valid dari server`);
                    return;
                }
            }

            if (res.ok) {
                toast.success('Izin disetujui dan pengganti telah ditugaskan');
                setApproveDialog(false);
                fetchLeaveRequests();
            } else {
                console.error('[Admin LeaveRequests] Error response:', data);
                let errorMessage = 'Gagal menyetujui izin';
                
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
            console.error('[Admin LeaveRequests] Catch error:', error);
            toast.error('Error menyetujui izin');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectClick = (request: LeaveRequest) => {
        setSelectedRequest(request);
        setRejectNotes('');
        setRejectDialog(true);
    };

    const handleReject = async () => {
        if (!selectedRequest) return;

        setActionLoading(true);
        try {
            console.log('[Admin LeaveRequests] Rejecting leave request:', {
                leaveRequestId: selectedRequest.id,
                adminNotes: rejectNotes
            });

            const res = await fetch('/api/admin/leave-requests/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leaveRequestId: selectedRequest.id,
                    adminNotes: rejectNotes
                })
            });

            console.log('[Admin LeaveRequests] Reject response status:', res.status);
            const textResponse = await res.text();
            console.log('[Admin LeaveRequests] Reject response text:', textResponse);

            let data = {};
            if (textResponse && textResponse.trim()) {
                try {
                    data = JSON.parse(textResponse);
                } catch (e) {
                    console.error('[Admin LeaveRequests] Failed to parse response:', e);
                    toast.error(`Server error (${res.status}): Respons tidak valid dari server`);
                    return;
                }
            }

            if (res.ok) {
                toast.success('Izin ditolak');
                setRejectDialog(false);
                fetchLeaveRequests();
            } else {
                console.error('[Admin LeaveRequests] Reject error response:', data);
                let errorMessage = 'Gagal menolak izin';
                
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
            console.error('[Admin LeaveRequests] Catch error:', error);
            toast.error('Error menolak izin');
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
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Pengajuan Izin</h1>
                    <Button variant="outline" onClick={fetchLeaveRequests}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Pengajuan Menunggu Persetujuan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {leaveRequests.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>Tidak ada pengajuan izin yang menunggu persetujuan</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Karyawan</TableHead>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Shift</TableHead>
                                            <TableHead>Alasan</TableHead>
                                            <TableHead>Diajukan</TableHead>
                                            <TableHead>Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leaveRequests.map((request) => (
                                            <TableRow key={request.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{request.employee_name}</p>
                                                        <p className="text-sm text-muted-foreground">{request.employee_email}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {format(new Date(request.scheduled_date), 'dd MMM yyyy', { locale: idLocale })}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: request.color }}
                                                        />
                                                        <span>{request.shift_name}</span>
                                                        <span className="text-sm text-muted-foreground">
                                                            ({request.start_time} - {request.end_time})
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm')}
                                                </TableCell>
                                                <TableCell className="space-x-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleApproveClick(request)}
                                                        disabled={actionLoading}
                                                        className="text-green-600 border-green-600 hover:bg-green-50"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                                        Setujui
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleRejectClick(request)}
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

            {/* Approve Dialog */}
            <Dialog open={approveDialog} onOpenChange={setApproveDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Pilih Karyawan Pengganti
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {selectedRequest && (
                            <div className="p-3 bg-muted rounded-lg text-sm">
                                <p><strong>Karyawan:</strong> {selectedRequest.employee_name}</p>
                                <p><strong>Tanggal:</strong> {format(new Date(selectedRequest.scheduled_date), 'EEEE, dd MMMM yyyy', { locale: idLocale })}</p>
                                <p className="flex items-center gap-2">
                                    <strong>Shift:</strong>
                                    <span
                                        className="w-3 h-3 rounded-full inline-block"
                                        style={{ backgroundColor: selectedRequest.color }}
                                    />
                                    {selectedRequest.shift_name} ({selectedRequest.start_time} - {selectedRequest.end_time})
                                </p>
                                <p><strong>Alasan:</strong> {selectedRequest.reason}</p>
                            </div>
                        )}

                        <div>
                            <Label>Pilih Pengganti</Label>
                            {loadingReplacements ? (
                                <div className="text-center py-4 text-muted-foreground">Mencari karyawan tersedia...</div>
                            ) : availableEmployees.length === 0 ? (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                                    <AlertCircle className="h-4 w-4 inline mr-2" />
                                    Tidak ada karyawan yang tersedia pada tanggal ini
                                </div>
                            ) : (
                                <Select value={selectedReplacement} onValueChange={setSelectedReplacement}>
                                    <SelectTrigger className="mt-2">
                                        <SelectValue placeholder="Pilih karyawan pengganti" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableEmployees.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                <div>
                                                    <span className="font-medium">{emp.full_name}</span>
                                                    {emp.department && (
                                                        <span className="text-muted-foreground ml-2">({emp.department})</span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="approve-notes">Catatan (Opsional)</Label>
                            <Textarea
                                id="approve-notes"
                                value={approveNotes}
                                onChange={(e) => setApproveNotes(e.target.value)}
                                placeholder="Catatan tambahan..."
                                className="mt-2"
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setApproveDialog(false)}
                                disabled={actionLoading}
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleApprove}
                                disabled={actionLoading || !selectedReplacement}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {actionLoading ? 'Menyetujui...' : 'Setujui & Tugaskan'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tolak Pengajuan Izin</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {selectedRequest && (
                            <div className="text-sm text-muted-foreground">
                                <p>Karyawan: <strong>{selectedRequest.employee_name}</strong></p>
                                <p>Tanggal: <strong>{format(new Date(selectedRequest.scheduled_date), 'dd MMM yyyy', { locale: idLocale })}</strong></p>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="reject-notes">Alasan Penolakan (Opsional)</Label>
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
