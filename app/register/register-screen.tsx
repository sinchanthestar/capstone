'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type SetupStatus = {
  isInitialized: boolean;
  tablesCreated: boolean;
  adminExists: boolean;
  setupStep: string;
  dbConfigured?: boolean;
  connectionValid?: boolean;
  error?: string;
};

export function RegisterScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  const canRegisterInitialAdmin = useMemo(() => {
    if (!status) return false;
    return !!status.dbConfigured && !!status.connectionValid && !!status.tablesCreated && !status.adminExists;
  }, [status]);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        setLoadingStatus(true);
        setError(null);

        const response = await fetch('/api/setup/status', { cache: 'no-store' });
        const data: SetupStatus = await response.json();

        if (cancelled) return;
        setStatus(data);

        if (!data.dbConfigured || !data.connectionValid) {
          return;
        }

        if (!data.tablesCreated) {
          router.replace('/setup');
          return;
        }

        if (data.adminExists) {
          router.replace('/login');
          return;
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to check setup status');
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    }

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canRegisterInitialAdmin) {
      toast.error('Registration is not available right now');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: 'admin',
        }),
      });

      if (response.ok) {
        toast.success('Admin account created');
        router.push('/admin');
        return;
      }

      const data = await response.json().catch(() => ({} as any));
      const message = data?.error || 'Failed to create account';
      setError(message);
      toast.error(message);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Registration failed';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Spinner className="h-8 w-8" />
              <p className="text-center text-muted-foreground">Checking system status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status && (!status.dbConfigured || !status.connectionValid)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Cannot Register Yet</CardTitle>
            <CardDescription>Database configuration is required before creating an admin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {status.error ||
                  (!status.dbConfigured
                    ? 'DATABASE_URL is not configured'
                    : 'Unable to connect to database')}
              </AlertDescription>
            </Alert>

            <Button className="w-full" onClick={() => router.push('/setup')}>
              Go to Setup
            </Button>
            <Button className="w-full" variant="outline" onClick={() => router.push('/login')}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Admin Account</CardTitle>
          <CardDescription>This is only available during initial setup</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                disabled={submitting || !canRegisterInitialAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={submitting || !canRegisterInitialAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={submitting || !canRegisterInitialAdmin}
                placeholder="min 8 characters"
              />
            </div>

            <Button className="w-full" type="submit" disabled={submitting || !canRegisterInitialAdmin}>
              {submitting ? 'Creating...' : 'Create Admin'}
            </Button>

            <Button className="w-full" type="button" variant="outline" onClick={() => router.push('/login')}>
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
