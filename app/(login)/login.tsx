'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coffee, Loader2, Mail, Lock, Eye, EyeOff, Shield, Star, ArrowLeft } from 'lucide-react';
import { signIn, signUp } from './actions';
import { ActionState } from '@/lib/auth/middleware';
import { useState } from 'react';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const trialPeriodDays = searchParams.get('trialPeriodDays');
  const inviteId = searchParams.get('inviteId');
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-[100dvh] flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-400 to-orange-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10"></div>
        
        {/* Back to Home Link */}
        <Link 
          href="/" 
          className="absolute top-8 left-8 z-20 flex items-center gap-2 text-white hover:text-orange-100 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Volver al inicio</span>
        </Link>
        
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          <div className="flex items-center mb-8">
            <Coffee className="h-12 w-12 text-white" />
            <span className="ml-3 text-3xl font-bold">Acme Cafes</span>
          </div>
          
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold mb-6">
              {mode === 'signin' 
                ? 'Bienvenido de vuelta' 
                : 'Únete a la comunidad cafetera'}
            </h1>
            <p className="text-xl text-orange-100 mb-8">
              {mode === 'signin'
                ? 'Accede a tu cuenta y disfruta del mejor café de especialidad directo a tu puerta.'
                : 'Descubre granos excepcionales y únete a más de 2,500 amantes del café que ya disfrutan de nuestra experiencia premium.'}
            </p>
            
                         {/* Social Proof */}
             <div className="bg-white bg-opacity-90 rounded-2xl p-6 shadow-lg">
               <div className="flex items-center justify-center gap-2 mb-3">
                 <div className="flex -space-x-1">
                   {[1,2,3,4].map((i) => (
                     <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-bold">
                       {i === 1 ? 'LM' : i === 2 ? 'RS' : i === 3 ? 'CL' : 'AR'}
                     </div>
                   ))}
                 </div>
                 <span className="text-sm font-medium ml-2 text-gray-800">
                   2,500+ clientes satisfechos
                 </span>
               </div>
               <div className="flex items-center justify-center gap-1">
                 {[1,2,3,4,5].map((i) => (
                   <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                 ))}
                 <span className="ml-2 text-sm text-gray-700">4.9/5 valoración promedio</span>
               </div>
             </div>
          </div>
        </div>
        
        {/* Coffee beans decoration */}
        <div className="absolute top-10 right-10 w-20 h-20 bg-white bg-opacity-20 rounded-full"></div>
        <div className="absolute bottom-20 left-10 w-32 h-32 bg-white bg-opacity-15 rounded-full"></div>
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-white bg-opacity-20 rounded-full"></div>
        <div className="absolute top-20 left-1/3 w-12 h-12 bg-yellow-300 bg-opacity-30 rounded-full"></div>
        <div className="absolute bottom-1/3 right-10 w-8 h-8 bg-yellow-200 bg-opacity-40 rounded-full"></div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 relative">
        {/* Mobile Back Link */}
        <Link 
          href="/" 
          className="absolute top-4 left-4 lg:hidden flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Volver</span>
        </Link>
        
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Mobile logo */}
          <div className="flex justify-center lg:hidden mb-8">
            <div className="flex items-center">
              <Coffee className="h-10 w-10 text-orange-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">Acme Cafes</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {mode === 'signin' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h2>
            <p className="text-gray-600">
              {mode === 'signin'
                ? 'Accede a tu cuenta para gestionar tu suscripción'
                : 'Comienza tu experiencia premium de café'}
            </p>
          </div>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
            <form className="space-y-6" action={formAction}>
              <input type="hidden" name="redirect" value={redirect || ''} />
              <input type="hidden" name="priceId" value={priceId || ''} />
              <input
                type="hidden"
                name="trialPeriodDays"
                value={trialPeriodDays || ''}
              />
              <input type="hidden" name="inviteId" value={inviteId || ''} />

              {/* Email Field */}
              <div>
                <Label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-900 mb-2"
                >
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={state.email}
                    required
                    maxLength={50}
                    className="pl-10 h-12 rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-gray-900 placeholder-gray-500"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <Label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-900 mb-2"
                >
                  Contraseña
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={
                      mode === 'signin' ? 'current-password' : 'new-password'
                    }
                    defaultValue={state.password}
                    required
                    minLength={8}
                    maxLength={100}
                    className="pl-10 pr-10 h-12 rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-gray-900 placeholder-gray-500"
                    placeholder={mode === 'signin' ? 'Tu contraseña' : 'Mínimo 8 caracteres'}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {mode === 'signup' && (
                  <p className="mt-1 text-xs text-gray-500">
                    Debe tener al menos 8 caracteres
                  </p>
                )}
              </div>

              {/* Error Message */}
              {state?.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm font-medium">{state.error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={pending}
                >
                  {pending ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-5 w-5" />
                      Procesando...
                    </>
                  ) : mode === 'signin' ? (
                    'Iniciar Sesión'
                  ) : (
                    'Crear Cuenta'
                  )}
                </Button>
              </div>

              {/* Security Notice for Signup */}
              {mode === 'signup' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 text-green-600 mr-2" />
                    <p className="text-green-700 text-xs">
                      Tu información está protegida con encriptación de nivel bancario
                    </p>
                  </div>
                </div>
              )}
            </form>

            {/* Divider */}
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">
                    {mode === 'signin'
                      ? '¿Nuevo en Acme Cafes?'
                      : '¿Ya tienes una cuenta?'}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${
                    redirect ? `?redirect=${redirect}` : ''
                  }${priceId ? `&priceId=${priceId}` : ''}${
                    trialPeriodDays ? `&trialPeriodDays=${trialPeriodDays}` : ''
                  }`}
                  className="w-full flex justify-center items-center h-12 border border-gray-300 rounded-lg shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
                >
                  {mode === 'signin'
                    ? 'Crear cuenta nueva'
                    : 'Iniciar sesión'}
                </Link>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>Datos seguros</span>
              </div>
              <div className="flex items-center gap-1">
                <Coffee className="w-3 h-3" />
                <span>Satisfacción garantizada</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                <span>2,500+ clientes felices</span>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-xs text-gray-500">
                Al {mode === 'signin' ? 'iniciar sesión' : 'crear una cuenta'}, aceptas nuestros{' '}
                <Link href="/terms" className="text-orange-600 hover:text-orange-700 font-medium">
                  Términos de Servicio
                </Link>{' '}
                y{' '}
                <Link href="/privacy" className="text-orange-600 hover:text-orange-700 font-medium">
                  Política de Privacidad
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
