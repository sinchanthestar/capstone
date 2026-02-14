'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import Link from 'next/link';
import { Clock, Lock as LockIcon, ArrowLeft, CheckCircle2 } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          <Card className="border border-white/20 bg-card/80 backdrop-blur-xl shadow-2xl">
            <CardContent className="pt-6">
              <Alert className="border-red-200 bg-red-50 mb-4">
                <AlertDescription className="text-red-800">
                  Token reset tidak ditemukan. Silakan periksa link yang Anda gunakan.
                </AlertDescription>
              </Alert>
              <Link href="/forgot-password">
                <Button className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Kembali ke Lupa Kata Sandi
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Kata sandi tidak cocok');
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error('Kata sandi minimal 8 karakter');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success('Kata sandi berhasil direset');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        toast.error(data.error || 'Gagal mereset kata sandi');
      }
    } catch (error) {
      toast.error('Gagal memproses request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo Section */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center gap-2 mb-6 group hover:opacity-80 transition-opacity">
            <div className="p-2 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Shift Manager</h1>
          </div>
          <p className="text-muted-foreground">Buat Kata Sandi Baru</p>
        </div>

        {/* Reset Card */}
        <Card className="border border-white/20 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Atur Ulang Kata Sandi</CardTitle>
            <CardDescription>Masukkan kata sandi baru Anda</CardDescription>
          </CardHeader>
          <CardContent>
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">Kata Sandi Baru</Label>
                  <div className="relative">
                    <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.newPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, newPassword: e.target.value })
                      }
                      required
                      disabled={loading}
                      className="pl-10 bg-background/50 border-border/50 hover:border-border transition-colors focus:border-primary"
                      minLength={8}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Minimal 8 karakter</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Konfirmasi Kata Sandi</Label>
                  <div className="relative">
                    <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      required
                      disabled={loading}
                      className="pl-10 bg-background/50 border-border/50 hover:border-border transition-colors focus:border-primary"
                      minLength={8}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0 py-6 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Memproses...' : 'Atur Ulang Kata Sandi'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center py-4">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                <div>
                  <h3 className="font-semibold text-green-800 mb-2">Kata Sandi Berhasil Direset!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Silakan login dengan kata sandi baru Anda
                  </p>
                </div>
              </div>
            )}

            {!success && (
              <div className="mt-6 pt-6 border-t border-border/50">
                <Link href="/login">
                  <Button variant="outline" className="w-full border-border/50 hover:bg-primary/10">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Kembali ke Login
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
