'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  User, 
  CreditCard, 
  UserPlus, 
  Settings, 
  LogIn,
  LogOut,
  Clock
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'login' | 'logout' | 'subscription' | 'member_added' | 'settings_changed' | 'payment';
  description: string;
  timestamp: string;
  icon: React.ElementType;
  severity: 'low' | 'medium' | 'high';
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'login',
    description: 'Inicio de sesión exitoso desde dispositivo móvil',
    timestamp: '2024-01-15 14:30:00',
    icon: LogIn,
    severity: 'low'
  },
  {
    id: '2',
    type: 'subscription',
    description: 'Plan actualizado a Plus - Facturación mensual',
    timestamp: '2024-01-15 10:15:00',
    icon: CreditCard,
    severity: 'medium'
  },
  {
    id: '3',
    type: 'member_added',
    description: 'Nuevo miembro agregado: juan@ejemplo.com',
    timestamp: '2024-01-14 16:45:00',
    icon: UserPlus,
    severity: 'medium'
  },
  {
    id: '4',
    type: 'payment',
    description: 'Pago procesado exitosamente - $240 MXN',
    timestamp: '2024-01-14 09:20:00',
    icon: CreditCard,
    severity: 'high'
  },
  {
    id: '5',
    type: 'settings_changed',
    description: 'Configuración de notificaciones actualizada',
    timestamp: '2024-01-13 11:30:00',
    icon: Settings,
    severity: 'low'
  },
  {
    id: '6',
    type: 'login',
    description: 'Inicio de sesión desde nueva ubicación',
    timestamp: '2024-01-13 08:15:00',
    icon: LogIn,
    severity: 'medium'
  },
  {
    id: '7',
    type: 'logout',
    description: 'Sesión cerrada automáticamente por inactividad',
    timestamp: '2024-01-12 22:30:00',
    icon: LogOut,
    severity: 'low'
  }
];

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'high':
      return 'bg-red-100 text-red-700';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'low':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getSeverityLabel(severity: string) {
  switch (severity) {
    case 'high':
      return 'Alta';
    case 'medium':
      return 'Media';
    case 'low':
      return 'Baja';
    default:
      return 'N/A';
  }
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    return 'Hace menos de 1 hora';
  } else if (diffInHours < 24) {
    return `Hace ${diffInHours} hora${diffInHours !== 1 ? 's' : ''}`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `Hace ${diffInDays} día${diffInDays !== 1 ? 's' : ''}`;
  }
}

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Registro de Actividad
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Visualiza todas las actividades recientes de tu cuenta y equipo.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Activity Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Actividades Hoy
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">3</p>
                </div>
                <Activity className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Esta Semana
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">7</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Eventos Importantes
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">2</p>
                </div>
                <CreditCard className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <CardTitle>Actividad Reciente</CardTitle>
            </div>
            <CardDescription>
              Historial completo de acciones y eventos en tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockActivities.map((activity, index) => {
                const IconComponent = activity.icon;
                return (
                  <div key={activity.id}>
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                          <IconComponent className="h-5 w-5 text-orange-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {activity.description}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatTimestamp(activity.timestamp)}
                            </p>
                          </div>
                          <Badge className={getSeverityColor(activity.severity)}>
                            {getSeverityLabel(activity.severity)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {index < mockActivities.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
