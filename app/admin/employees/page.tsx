'use client';

import React from "react";

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  department?: string;
  position?: string;
  phone?: string;
  hire_date?: string;
  is_available: boolean;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // edit employee dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    department: '',
    position: '',
    phone: '',
    isAvailable: true,
  });

  // create employee dialog
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
      }
    } catch (error) {
      toast.error('Gagal memuat data karyawan');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      department: employee.department || '',
      position: employee.position || '',
      phone: employee.phone || '',
      isAvailable: employee.is_available,
    });
    setOpenDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    try {
      const response = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: editingEmployee.id,
          department: formData.department,
          position: formData.position,
          phone: formData.phone,
          isAvailable: formData.isAvailable,
        }),
      });

      if (response.ok) {
        toast.success('Karyawan berhasil diperbarui');
        setOpenDialog(false);
        fetchEmployees();
      } else {
        toast.error('Gagal memperbarui karyawan');
      }
    } catch (error) {
      toast.error('Error memperbarui karyawan');
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (createForm.password.length < 8) {
      toast.error('Password minimal 8 karakter');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          fullName: createForm.fullName,
          role: 'employee',
        }),
      });

      if (response.ok) {
        toast.success('Akun karyawan berhasil dibuat');
        setOpenCreateDialog(false);
        setCreateForm({ fullName: '', email: '', password: '' });
        fetchEmployees();
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || 'Gagal membuat akun karyawan');
      }
    } catch (error) {
      toast.error('Gagal membuat akun karyawan');
    } finally {
      setCreateLoading(false);
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
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Karyawan</h1>

          <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
            <DialogTrigger asChild>
              <Button>Tambah Karyawan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat Akun Karyawan</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateEmployee} className="space-y-4">
                <div>
                  <Label htmlFor="newFullName">Nama Lengkap</Label>
                  <Input
                    id="newFullName"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    required
                    disabled={createLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="newEmail">Email</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                    disabled={createLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="newPassword">Password Sementara</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                    disabled={createLoading}
                    placeholder="minimal 8 karakter"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createLoading}>
                  {createLoading ? 'Membuat...' : 'Buat Karyawan'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Karyawan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{employee.email}</TableCell>
                      <TableCell>{employee.department || '-'}</TableCell>
                      <TableCell>{employee.position || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={employee.is_available ? 'default' : 'outline'}>
                          {employee.is_available ? 'Tersedia' : 'Tidak Tersedia'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog
                          open={openDialog && editingEmployee?.id === employee.id}
                          onOpenChange={setOpenDialog}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(employee)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Karyawan</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                              <div>
                                <Label htmlFor="department">Departemen</Label>
                                <Input
                                  id="department"
                                  value={formData.department}
                                  onChange={(e) =>
                                    setFormData({ ...formData, department: e.target.value })
                                  }
                                  placeholder="contoh: Penjualan"
                                />
                              </div>
                              <div>
                                <Label htmlFor="position">Jabatan</Label>
                                <Input
                                  id="position"
                                  value={formData.position}
                                  onChange={(e) =>
                                    setFormData({ ...formData, position: e.target.value })
                                  }
                                  placeholder="contoh: Manajer"
                                />
                              </div>
                              <div>
                                <Label htmlFor="phone">Telepon</Label>
                                <Input
                                  id="phone"
                                  value={formData.phone}
                                  onChange={(e) =>
                                    setFormData({ ...formData, phone: e.target.value })
                                  }
                                  placeholder="contoh: +62 812-3456-7890"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="available"
                                  checked={formData.isAvailable}
                                  onCheckedChange={(checked) =>
                                    setFormData({ ...formData, isAvailable: checked as boolean })
                                  }
                                />
                                <Label htmlFor="available" className="mb-0">
                                  Karyawan tersedia untuk jadwal
                                </Label>
                              </div>
                              <Button type="submit" className="w-full">
                                Simpan Perubahan
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
