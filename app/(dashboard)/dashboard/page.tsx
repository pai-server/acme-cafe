import { redirect } from 'next/navigation';

export default function DashboardRedirect() {
  // Redirigir inmediatamente a la nueva ruta de settings
  redirect('/settings');
} 