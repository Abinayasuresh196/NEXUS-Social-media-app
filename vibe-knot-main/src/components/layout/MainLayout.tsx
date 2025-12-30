import { ReactNode } from 'react';
import { Sidebar, BottomNav } from './Navigation';
import { useAuth } from '@/contexts/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { user } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:ml-64 pb-16 md:pb-0">
        <div className="max-w-4xl xl:max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};
