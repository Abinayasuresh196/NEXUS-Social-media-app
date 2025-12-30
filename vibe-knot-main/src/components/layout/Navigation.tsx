import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, Heart, User, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

export const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  // Ensure unreadCount is a number
  const badgeCount = typeof unreadCount === 'number' ? unreadCount : 0;

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/explore', icon: Search, label: 'Explore' },
    { path: '/create', icon: PlusSquare, label: 'Create' },
    { path: '/notifications', icon: Heart, label: 'Notifications', badge: badgeCount },
    { path: user ? `/profile/${user.id}` : '/auth', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex flex-col items-center justify-center p-2 relative',
              location.pathname === item.path ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <item.icon className="h-6 w-6" />
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  // Ensure unreadCount is a number
  const badgeCount = typeof unreadCount === 'number' ? unreadCount : 0;

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/explore', icon: Search, label: 'Explore' },
    { path: '/messages', icon: MessageCircle, label: 'Messages' },
    { path: '/notifications', icon: Heart, label: 'Notifications', badge: badgeCount },
    { path: '/create', icon: PlusSquare, label: 'Create' },
    { path: user ? `/profile/${user.id}` : '/auth', icon: User, label: 'Profile' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border h-screen fixed left-0 top-0 bg-card">
      <div className="p-6">
        <Link to="/" className="text-2xl font-bold text-primary font-serif">
          Nexus
        </Link>
      </div>
      <nav className="flex-1 px-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-4 px-4 py-3 rounded-lg mb-1 transition-colors relative',
              location.pathname === item.path
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-foreground hover:bg-muted'
            )}
          >
            <item.icon className="h-6 w-6" />
            <span>{item.label}</span>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
};
