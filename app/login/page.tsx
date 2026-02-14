'use client';

import React from "react"
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';
import { Clock, Mail, Lock as LockIcon, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Berhasil masuk');

        // Route based on role
        if (data.user.role === 'admin' || data.user.role === 'manager') {
          router.push('/admin');
        } else {
          router.push('/employee');
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Email atau password salah');
      }
    } catch (error) {
      toast.error('Gagal masuk');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
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
          <p className="text-muted-foreground">Sistem Manajemen Jadwal Karyawan</p>
        </div>

        {/* Login Card with Glassmorphism */}
        <Card className="border border-white/20 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Selamat Datang</CardTitle>
            <CardDescription>Masuk ke akun Anda untuk melanjutkan</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Alamat Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@contoh.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    disabled={loading}
                    className="pl-10 bg-background/50 border-border/50 hover:border-border transition-colors focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Kata Sandi</Label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">Lupa?</Link>
                </div>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    disabled={loading}
                    className="pl-10 bg-background/50 border-border/50 hover:border-border transition-colors focus:border-primary"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0 py-6 text-base font-semibold group"
                disabled={loading}
              >
                {loading ? (
                  <span>Sedang masuk...</span>
                ) : (
                  <>
                    Masuk
                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/50">
              <p className="text-sm text-center text-muted-foreground mb-4">
                Belum punya akun?
              </p>
              <Link href="/register">
                <Button variant="outline" className="w-full border-border/50 hover:bg-primary/10">
                  Buat Akun
                </Button>
              </Link>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-xs font-semibold text-accent mb-2">Akun Demo:</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">admin@example.com</span>
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">password123</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer Link */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Dengan masuk, Anda menyetujui <a href="#" className="text-primary hover:underline">Ketentuan Layanan</a> kami</p>
        </div>
      </div>
    </div>
  );
}

