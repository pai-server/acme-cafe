'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Coffee, Home, LogOut, User, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { useRouter, usePathname } from 'next/navigation';
import { User as UserType } from '@/lib/db/schema';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useSWR<UserType>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.refresh();
    router.push('/');
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-3">
        <Button variant="ghost" asChild className="text-gray-600 hover:text-gray-900">
          <Link href="/sign-in">Iniciar Sesión</Link>
        </Button>
        <Button asChild className="bg-orange-600 hover:bg-orange-700">
          <Link href="/sign-up">Registrarse</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage alt={user.name || ''} />
            <AvatarFallback className="bg-orange-100 text-orange-700">
              {user.email
                .split('@')[0]
                .split('')
                .slice(0, 2)
                .map((char) => char.toUpperCase())
                .join('')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium">{user.name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
                          <Link href="/settings" className="w-full cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
              Ajustes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Navigation() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/pricing', label: 'Planes' },
  ];

  return (
    <nav className="hidden md:flex items-center space-x-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`text-sm font-medium transition-colors hover:text-gray-900 ${
            pathname === item.href 
              ? 'text-gray-900' 
              : 'text-gray-600'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Coffee className="h-6 w-6 text-orange-500" />
              <span className="text-xl font-bold text-gray-900">
                Acme Cafes
              </span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-6">
            <Navigation />
            <Suspense fallback={
              <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse" />
            }>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
} 