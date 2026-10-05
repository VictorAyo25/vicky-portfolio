'use client';

import { AuthProvider } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { isOwnerDevice, trackAdminAccess } from '@/lib/analytics';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const reportedVisit = useRef(false);

  // A signed-out visit to the admin area, logged once per visit (the first
  // page they hit, before the redirect to login). The owner's own devices are
  // skipped so only strangers show up.
  useEffect(() => {
    if (loading || user || reportedVisit.current) return;
    reportedVisit.current = true;
    if (!isOwnerDevice()) trackAdminAccess('visit', { path: pathname });
  }, [user, loading, pathname]);

  useEffect(() => {
    if (!loading && !user && pathname !== '/backoffice/login') {
      router.push('/backoffice/login');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
      </div>
    );
  }

  // If on login page and already authenticated, redirect to dashboard
  if (user && pathname === '/backoffice/login') {
    router.replace('/backoffice/dashboard');
    return null;
  }

  // If not logged in and not on login page, render nothing until redirect
  if (!user && pathname !== '/backoffice/login') return null;

  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedRoute>{children}</ProtectedRoute>
    </AuthProvider>
  );
}
