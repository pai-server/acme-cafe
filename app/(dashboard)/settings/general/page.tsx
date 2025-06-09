'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Globe, Palette, Bell } from 'lucide-react';
import useSWR from 'swr';
import { User as UserType } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function GeneralPage() {
  const { data: user } = useSWR<UserType>('/api/user', fetcher);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Configuración General
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Gestiona tu información personal y preferencias de cuenta.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-orange-500" />
              <CardTitle>Información de la Cuenta</CardTitle>
            </div>
            <CardDescription>
              Actualiza tu información personal y datos de contacto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  placeholder="Tu nombre completo"
                  defaultValue={user?.name || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  defaultValue={user?.email || ''}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Biografía</Label>
              <Textarea
                id="bio"
                placeholder="Cuéntanos un poco sobre ti..."
                className="resize-none"
                rows={3}
              />
            </div>
            <Button className="bg-orange-600 hover:bg-orange-700">
              Guardar Cambios
            </Button>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Palette className="h-5 w-5 text-orange-500" />
              <CardTitle>Preferencias</CardTitle>
            </div>
            <CardDescription>
              Personaliza tu experiencia en la plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme">Tema Oscuro</Label>
                <p className="text-sm text-gray-500">
                  Activa el modo oscuro para una mejor experiencia visual.
                </p>
              </div>
              <Switch id="theme" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Notificaciones por Email</Label>
                <p className="text-sm text-gray-500">
                  Recibe actualizaciones importantes por correo electrónico.
                </p>
              </div>
              <Switch id="notifications" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing">Correos de Marketing</Label>
                <p className="text-sm text-gray-500">
                  Recibe ofertas especiales y novedades sobre productos.
                </p>
              </div>
              <Switch id="marketing" />
            </div>
          </CardContent>
        </Card>

        {/* Language & Region */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-orange-500" />
              <CardTitle>Idioma y Región</CardTitle>
            </div>
            <CardDescription>
              Configura tu idioma y zona horaria preferidos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Idioma</Label>
                <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20">
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Zona Horaria</Label>
                <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20">
                  <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                  <option value="America/New_York">Nueva York (GMT-5)</option>
                  <option value="Europe/Madrid">Madrid (GMT+1)</option>
                </select>
              </div>
            </div>
            <Button variant="outline">
              Actualizar Configuración Regional
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
