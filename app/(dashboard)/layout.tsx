'use client';

import Link from 'next/link';
import { use, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Coffee, Home, LogOut, Bell, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { signOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/db/schema';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function SubscriptionBadge() {
  const { data: subscriptionData } = useSWR('/api/subscription', fetcher);
  
  if (!subscriptionData?.hasSubscription) {
    return (
      <Badge variant="secondary" className="hidden md:inline-flex bg-gray-50 text-gray-700 border-gray-200">
        Sin suscripción
      </Badge>
    );
  }

  const subscription = subscriptionData.subscription;
  const isTrialing = subscription.status === 'trialing';
  
  return (
    <Badge 
      variant="secondary" 
      className={`hidden md:inline-flex ${
        subscription.needsAttention 
          ? 'bg-red-50 text-red-700 border-red-200' 
          : 'bg-orange-50 text-orange-700 border-orange-200'
      }`}
    >
      {subscription.productName} • {
        isTrialing 
          ? `${subscription.trialDaysRemaining} días restantes`
          : subscription.statusText
      }
    </Badge>
  );
}

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.refresh();
    router.push('/');
  }

  if (!user) {
    return (
      <>
        <Link
          href="/pricing"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Pricing
        </Link>
        <Button asChild className="rounded-full">
          <Link href="/sign-up">Sign Up</Link>
        </Button>
      </>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback>
            {user.email
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {user.name && <p className="font-medium">{user.name}</p>}
            <p className="w-[200px] truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        <hr className="my-1" />
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/settings" className="flex w-full items-center">
            <Home className="mr-2 h-4 w-4" />
            <span>Ajustes</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/" className="flex w-full items-center">
            <Coffee className="mr-2 h-4 w-4" />
            <span>Ir a la tienda</span>
          </Link>
        </DropdownMenuItem>
        <hr className="my-1" />
        <form action={handleSignOut} className="w-full">
          <button type="submit" className="flex w-full">
            <DropdownMenuItem className="w-full flex-1 cursor-pointer text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left side - Logo */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600">
                <Coffee className="h-5 w-5 text-white" />
              </div>
              <span className="hidden sm:inline-block">Acme Cafes</span>
            </Link>
            
            <SubscriptionBadge />
          </div>

          {/* Right side - User menu and notifications */}
          <div className="flex items-center gap-4">
            {/* Search button */}
            <Button variant="ghost" size="sm" className="hidden md:flex">
              <Search className="h-4 w-4" />
            </Button>
            
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-orange-600"></span>
            </Button>

            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="min-h-[calc(100vh-64px)]">
        {children}
      </div>
    </div>
  );
}
