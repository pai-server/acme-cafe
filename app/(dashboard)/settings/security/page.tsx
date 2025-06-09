'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Key, 
  Smartphone, 
  Lock, 
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Globe,
  Clock
} from 'lucide-react';
import { useState } from 'react';

export default function SecurityPage() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Seguridad y Privacidad
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Protege tu cuenta y gestiona tus configuraciones de seguridad.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Password Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-orange-500" />
              <CardTitle>Cambiar Contraseña</CardTitle>
            </div>
            <CardDescription>
              Actualiza tu contraseña regularmente para mantener tu cuenta segura.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contraseña Actual</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Ingresa tu contraseña actual"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Nueva contraseña"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirma la nueva contraseña"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Recomendaciones de Seguridad
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Usa al menos 8 caracteres</li>
                      <li>Incluye mayúsculas, minúsculas y números</li>
                      <li>Agrega símbolos especiales (@, #, $, etc.)</li>
                      <li>Evita información personal obvia</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <Button className="bg-orange-600 hover:bg-orange-700">
              Actualizar Contraseña
            </Button>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-orange-500" />
              <CardTitle>Autenticación de Dos Factores</CardTitle>
            </div>
            <CardDescription>
              Agrega una capa extra de seguridad a tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="2fa">Activar 2FA</Label>
                <p className="text-sm text-gray-500">
                  Requerirá un código de tu teléfono para iniciar sesión.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
                  {twoFactorEnabled ? "Activado" : "Desactivado"}
                </Badge>
                <Switch
                  id="2fa"
                  checked={twoFactorEnabled}
                  onCheckedChange={setTwoFactorEnabled}
                />
              </div>
            </div>
            
            {twoFactorEnabled && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      2FA Configurado Exitosamente
                    </h3>
                    <p className="mt-1 text-sm text-green-700">
                      Tu cuenta ahora está protegida con autenticación de dos factores.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex space-x-3">
              <Button 
                variant={twoFactorEnabled ? "outline" : "default"}
                className={!twoFactorEnabled ? "bg-orange-600 hover:bg-orange-700" : ""}
              >
                {twoFactorEnabled ? "Reconfigurar 2FA" : "Configurar 2FA"}
              </Button>
              {twoFactorEnabled && (
                <Button variant="outline" className="text-red-600 hover:text-red-700">
                  Desactivar 2FA
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-orange-500" />
              <CardTitle>Configuración de Seguridad</CardTitle>
            </div>
            <CardDescription>
              Controla cómo y cuándo puedes acceder a tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="login-notifications">Notificaciones de Inicio</Label>
                <p className="text-sm text-gray-500">
                  Recibe emails cuando alguien acceda a tu cuenta.
                </p>
              </div>
              <Switch id="login-notifications" defaultChecked />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="session-timeout">Cierre de Sesión Automático</Label>
                <p className="text-sm text-gray-500">
                  Cierra la sesión automáticamente después de inactividad.
                </p>
              </div>
              <Switch id="session-timeout" defaultChecked />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="device-management">Gestión de Dispositivos</Label>
                <p className="text-sm text-gray-500">
                  Permite gestionar dispositivos conectados a tu cuenta.
                </p>
              </div>
              <Button variant="outline" size="sm">
                Ver Dispositivos
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Security Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle>Actividad de Seguridad Reciente</CardTitle>
            </div>
            <CardDescription>
              Revisa los eventos de seguridad recientes en tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Inicio de sesión exitoso
                      </p>
                      <p className="text-sm text-gray-500">
                        Desde México, Ciudad de México • Hace 2 horas
                      </p>
                    </div>
                    <Globe className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Key className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Contraseña actualizada
                      </p>
                      <p className="text-sm text-gray-500">
                        Hace 3 días
                      </p>
                    </div>
                    <Clock className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                    <Smartphone className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        2FA configurado
                      </p>
                      <p className="text-sm text-gray-500">
                        Hace 1 semana
                      </p>
                    </div>
                    <Shield className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
