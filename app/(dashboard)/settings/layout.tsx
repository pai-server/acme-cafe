'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Settings, 
  Shield, 
  Activity, 
  Menu, 
  X,
  ChevronRight
} from 'lucide-react';
import { NavLink } from './nav-link';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { 
      href: '/settings', 
      icon: Users, 
      label: 'Equipo'
    },
    { 
      href: '/settings/general', 
      icon: Settings, 
      label: 'Configuración'
    },
    { 
      href: '/settings/activity', 
      icon: Activity, 
      label: 'Actividad'
    },
    { 
      href: '/settings/security', 
      icon: Shield, 
      label: 'Seguridad'
    }
  ];

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-16 bottom-0 left-0 z-40 w-52 transform bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="flex h-12 items-center justify-between px-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Ajustes</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                className="group flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                activeClassName="bg-orange-50 text-orange-700 hover:bg-orange-50 hover:text-orange-700"
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content area */}
      <div className="lg:pl-52">
        {/* Mobile menu button */}
        <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm lg:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
            <span className="sr-only">Open sidebar</span>
          </Button>
          <div className="text-sm font-medium text-gray-900">Ajustes</div>
        </div>

        {/* Main content */}
        <main className="bg-gray-50 min-h-[calc(100vh-8rem)] lg:min-h-[calc(100vh-4rem)]">
          <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-none">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
