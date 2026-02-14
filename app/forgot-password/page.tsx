'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import Link from 'next/link';
import { Clock, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        // For development - show reset token/url
        if (data.resetToken) {
          setResetToken(data.resetToken);
          setResetUrl(data.resetUrl);
        }
        toast.success('Email verifikasi telah dikirim');
      } else {
        toast.error(data.error || 'Gagal mengirim email reset');
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
          <p className="text-muted-foreground">Atur Ulang Kata Sandi</p>
        </div>

        {/* Reset Card */}
        <Card className="border border-white/20 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Lupa Kata Sandi?</CardTitle>
            <CardDescription>
              {submitted
                ? 'Cek email Anda untuk link reset'
                : 'Masukkan email Anda dan kami akan mengirimkan link untuk mengatur ulang kata sandi'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Alamat Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@contoh.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 bg-background/50 border-border/50 hover:border-border transition-colors focus:border-primary"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0 py-6 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Memproses...' : 'Kirim Link Reset'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <Mail className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Email berisi link reset kata sandi telah dikirim. Silakan cek email Anda.
                  </AlertDescription>
                </Alert>

                {/* Development only - show reset token */}
                {resetToken && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertDescription className="text-blue-800 space-y-2">
                      <p className="font-semibold">Mode Development - Token Reset:</p>
                      <p className="font-mono text-xs break-all bg-white p-2 rounded">{resetToken}</p>
                      <Link href={resetUrl} className="text-blue-600 hover:underline text-sm font-semibold block mt-2">
                        → Klik untuk Reset Password
                      </Link>
                    </AlertDescription>
                  </Alert>
                )}

                <p className="text-sm text-muted-foreground">
                  Link reset akan berlaku selama 1 jam. Jika link sudah kadaluarsa, silakan minta link baru.
                </p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-border/50">
              <Link href="/login">
                <Button variant="outline" className="w-full border-border/50 hover:bg-primary/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Kembali ke Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
