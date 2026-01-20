'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, onAuthStateChange } from '@/lib/supabase/auth';
import { Spinner } from '@/components/ui';
import LogoutButton from '@/components/features/auth/LogoutButton';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      const { session } = await getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserEmail(session.user.email || null);
      setIsLoading(false);
    };

    checkSession();

    // Subscribe to auth changes (Supabase auto-refreshes tokens when this listener is active)
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      } else if (event === 'TOKEN_REFRESHED') {
        // Token was automatically refreshed by Supabase
        console.log('Token refreshed');
      } else if (session) {
        setUserEmail((session as { user: { email?: string } }).user.email || null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              Receipt Allocation Manager
            </h1>
            <div className="flex items-center gap-4">
              {userEmail && (
                <span className="text-sm text-gray-600">{userEmail}</span>
              )}
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
