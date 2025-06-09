'use client';

import { Button } from '@/components/ui/button';
import { Coffee, Users, Package, TrendingUp, ArrowRight, Plus, CreditCard, RefreshCw, AlertTriangle, Clock, Calendar, Settings, DollarSign, Shield, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { customerPortalAction, payUnpaidInvoiceAction, reactivateSubscriptionAction } from '@/lib/payments/actions';
import { inviteTeamMember } from '@/lib/dashboard/actions';
import useSWR from 'swr';
import { toast } from 'sonner';
import { useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Helper function to safely format dates from API
const formatDate = (dateString: string | null, options?: Intl.DateTimeFormatOptions) => {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString('es-ES', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return null;
  }
};

// Helper functions for SaaS metrics
const calculateMRR = (priceAmount: number, interval: string, currency: string) => {
  const monthlyAmount = interval === 'year' ? priceAmount / 12 : priceAmount;
  return `$${(monthlyAmount / 100).toFixed(0)} ${currency}`;
};

const calculateDaysActive = (createdDate: string | null) => {
  if (!createdDate) return 0;
  try {
    const created = new Date(createdDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    return 0;
  }
};

const calculateDaysToNextBilling = (nextBillingDate: string | null) => {
  if (!nextBillingDate) return null;
  try {
    const next = new Date(nextBillingDate);
    const now = new Date();
    const diffTime = next.getTime() - now.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  } catch (error) {
    return null;
  }
};

const getSubscriptionHealthScore = (status: string, cancelAtPeriodEnd: boolean, paymentFailed: boolean) => {
  if (paymentFailed || status === 'past_due' || status === 'unpaid') return { score: 'Crítico', color: 'red' };
  if (cancelAtPeriodEnd) return { score: 'En Riesgo', color: 'amber' };
  if (status === 'trialing') return { score: 'Evaluando', color: 'blue' };
  if (status === 'active') return { score: 'Excelente', color: 'green' };
  return { score: 'Pendiente', color: 'gray' };
};

export default function TeamPage() {
  const { data: subscriptionData, error, isLoading, mutate } = useSWR('/api/subscription', fetcher);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const paymentCompleted = searchParams.get('payment');

  const handleReactivateSubscription = async () => {
    startTransition(async () => {
      try {
        const result = await reactivateSubscriptionAction(new FormData());
        if (result.success) {
          toast.success(result.message);
          mutate(); // Refresh the subscription data
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        toast.error('Error al reactivar la suscripción');
      }
    });
  };

  const handlePayInvoice = async () => {
    // Mark that we're going to an invoice payment
    localStorage.setItem('invoice-payment-initiated', 'true');
    
    // Execute the server action to redirect to invoice
    const formData = new FormData();
    await payUnpaidInvoiceAction(formData);
  };

  // Handle payment completion notification
  useEffect(() => {
    if (paymentCompleted === 'completed') {
      toast.success('Pago procesado exitosamente');
      mutate(); // Refresh the subscription data
      
      // Clean up the URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.toString());
    }
  }, [paymentCompleted, mutate]);

  // Handle return from external invoice payment (for hosted invoice URLs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Check if user was in an invoice payment flow
        const invoicePaymentFlag = localStorage.getItem('invoice-payment-initiated');
        if (invoicePaymentFlag) {
          // User returned from invoice payment, refresh data
          localStorage.removeItem('invoice-payment-initiated');
          setTimeout(() => {
            mutate(); // Refresh subscription data
            toast.success('Verificando el estado del pago...');
          }, 1500);
        }
      }
    };

    const handleFocus = () => {
      // Check if user was in an invoice payment flow  
      const invoicePaymentFlag = localStorage.getItem('invoice-payment-initiated');
      if (invoicePaymentFlag) {
        localStorage.removeItem('invoice-payment-initiated');
        setTimeout(() => {
          mutate();
          toast.success('Verificando el estado del pago...');
        }, 1500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [mutate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuración del Equipo</h1>
          <p className="text-gray-600">Cargando información de suscripción...</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuración del Equipo</h1>
          <p className="text-red-600">Error al cargar la información de suscripción.</p>
        </div>
      </div>
    );
  }

  const hasSubscription = subscriptionData?.hasSubscription;
  const subscription = subscriptionData?.subscription;
  const team = subscriptionData?.team;
  const user = subscriptionData?.user;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuración del Equipo</h1>
        <p className="text-gray-600">
          Gestiona tu suscripción, miembros del equipo y configuración de café.
        </p>
      </div>

      {/* Current Subscription Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                <Coffee className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Suscripción del Equipo</h2>
                <p className="text-sm text-gray-600 mt-0.5">Gestiona tu plan de suscripción y facturación</p>
              </div>
            </div>
            {hasSubscription ? (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                subscription.needsAttention 
                  ? 'bg-red-100 text-red-800 border border-red-200' 
                  : subscription.status === 'trialing'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-green-100 text-green-800 border border-green-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  subscription.needsAttention 
                    ? 'bg-red-500' 
                    : subscription.status === 'trialing'
                    ? 'bg-blue-500'
                    : 'bg-green-500'
                }`}></div>
                {subscription.productName} • {subscription.statusText}
              </div>
            ) : (
              <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">
                Sin suscripción
              </Badge>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">
          {hasSubscription ? (
            <>
              {subscription.needsAttention && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {subscription.status === 'past_due' ? (
                        <CreditCard className="w-5 h-5 text-red-600 mt-0.5" />
                      ) : subscription.status === 'unpaid' ? (
                        <RefreshCw className="w-5 h-5 text-red-600 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-800">
                        {subscription.status === 'past_due' ? 'Pago vencido' : 
                         subscription.status === 'unpaid' ? 'Suscripción sin pagar' :
                         'Atención requerida'}
                      </h3>
                      <p className="mt-2 text-sm text-red-700">
                        {subscription.status === 'past_due' ? 
                          'Tu suscripción tiene un pago vencido. El botón "Pagar Ahora" te llevará directamente a la factura pendiente para completar el pago y reactivar tu servicio.' :
                          subscription.status === 'unpaid' ?
                          'Tu suscripción no está pagada. Haz clic en "Actualizar Pago" para ir directamente a la factura pendiente y resolver este problema.' :
                          'Tu suscripción necesita atención. Utiliza el botón "Resolver Problema" para revisar y corregir cualquier inconveniente.'
                        }
                      </p>
                      {subscription.status === 'past_due' && (
                        <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Tu servicio puede suspenderse si no se resuelve pronto
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Trial warning for subscriptions ending soon */}
              {subscription.status === 'trialing' && subscription.trialDaysRemaining <= 3 && subscription.trialDaysRemaining > 0 && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-amber-800">
                        Prueba gratuita por terminar
                      </h3>
                      <p className="mt-2 text-sm text-amber-700">
                        Tu período de prueba termina en {subscription.trialDaysRemaining} día{subscription.trialDaysRemaining === 1 ? '' : 's'}. 
                        Configura tu método de pago ahora para continuar sin interrupciones.
                      </p>
                      <p className="mt-1 text-xs text-amber-600 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Facturación iniciará el {formatDate(subscription.nextBillingDate) || 'próximamente'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Plan Overview */}
              <div className="mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Plan Actual</p>
                    <div className="flex items-baseline gap-3">
                      <p className="text-3xl font-bold text-gray-900">
                        ${(subscription.priceAmount / 100).toFixed(0)}
                      </p>
                      <span className="text-lg text-gray-600">{subscription.currency}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Facturado {subscription.interval === 'month' ? 'mensualmente' : 'anualmente'}
                      {subscription.status === 'trialing' ? ' (después de prueba)' : ''}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Próximo Cobro</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatDate(subscription.nextBillingDate, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      }) || 'No programado'}
                    </p>
                    {subscription.cancelAtPeriodEnd && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                        <Clock className="w-4 h-4" />
                        Cancelación programada
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Key metrics integrated */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Monthly Cost - What client pays */}
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Costo Mensual</p>
                      <p className="text-xl font-bold text-blue-900">
                        {calculateMRR(subscription.priceAmount, subscription.interval, subscription.currency)}
                      </p>
                      <p className="text-xs text-blue-700">Tu inversión mensual</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Subscription Health Score */}
                {(() => {
                  const health = getSubscriptionHealthScore(subscription.status, subscription.cancelAtPeriodEnd, subscription.needsAttention);
                  if (health.color === 'red') {
                    return (
                      <div className="bg-white p-4 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-red-600 font-medium">Estado de Cuenta</p>
                            <p className="text-xl font-bold text-red-900">{health.score}</p>
                            <p className="text-xs text-red-700">Salud de suscripción</p>
                          </div>
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-red-600" />
                          </div>
                        </div>
                      </div>
                    );
                  } else if (health.color === 'amber') {
                    return (
                      <div className="bg-white p-4 rounded-lg border border-amber-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-amber-600 font-medium">Estado de Cuenta</p>
                            <p className="text-xl font-bold text-amber-900">{health.score}</p>
                            <p className="text-xs text-amber-700">Salud de suscripción</p>
                          </div>
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-amber-600" />
                          </div>
                        </div>
                      </div>
                    );
                  } else if (health.color === 'blue') {
                    return (
                      <div className="bg-white p-4 rounded-lg border border-sky-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-sky-600 font-medium">Estado de Cuenta</p>
                            <p className="text-xl font-bold text-sky-900">{health.score}</p>
                            <p className="text-xs text-sky-700">Salud de suscripción</p>
                          </div>
                          <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-sky-600" />
                          </div>
                        </div>
                      </div>
                    );
                  } else if (health.color === 'green') {
                    return (
                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-green-600 font-medium">Estado de Cuenta</p>
                            <p className="text-xl font-bold text-green-900">{health.score}</p>
                            <p className="text-xs text-green-700">Salud de suscripción</p>
                          </div>
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-green-600" />
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Estado de Cuenta</p>
                            <p className="text-xl font-bold text-gray-900">{health.score}</p>
                            <p className="text-xs text-gray-700">Salud de suscripción</p>
                          </div>
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-gray-600" />
                          </div>
                        </div>
                      </div>
                    );
                  }
                })()}

                {/* Days to Next Billing */}
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Próxima Facturación</p>
                      <p className="text-xl font-bold text-blue-900">
                        {(() => {
                          const daysToNext = calculateDaysToNextBilling(subscription.nextBillingDate);
                          if (daysToNext === null) return 'N/A';
                          if (daysToNext === 0) return 'Hoy';
                          if (daysToNext === 1) return '1 día';
                          return `${daysToNext} días`;
                        })()}
                      </p>
                      <p className="text-xs text-blue-700">
                        {subscription.status === 'trialing' ? 'Inicio de facturación' : 'Hasta próximo cobro'}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Target className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-start">
                {/* Primary action button based on subscription status */}
                {subscription.needsAttention ? (
                  <div className="flex gap-3">
                    {subscription.status === 'past_due' || subscription.status === 'unpaid' ? (
                      <Button 
                        onClick={handlePayInvoice}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        {subscription.status === 'past_due' ? (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pagar Ahora
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Actualizar Pago
                          </>
                        )}
                      </Button>
                    ) : (
                      <form action={customerPortalAction}>
                        <Button 
                          type="submit" 
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Resolver Problema
                        </Button>
                      </form>
                    )}
                    
                    {/* Secondary button for full portal access */}
                    {(subscription.status === 'past_due' || subscription.status === 'unpaid') && (
                      <form action={customerPortalAction}>
                        <Button 
                          type="submit" 
                          variant="outline"
                          className="border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Gestionar Suscripción
                        </Button>
                      </form>
                    )}
                  </div>
                ) : subscription.status === 'trialing' ? (
                  <form action={customerPortalAction}>
                    <Button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Configurar Método de Pago
                    </Button>
                  </form>
                ) : subscription.cancelAtPeriodEnd ? (
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleReactivateSubscription}
                      disabled={isPending}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
                      {isPending ? 'Reactivando...' : 'Reactivar Suscripción'}
                    </Button>
                    <form action={customerPortalAction}>
                      <Button 
                        type="submit" 
                        variant="outline"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Gestionar Suscripción
                      </Button>
                    </form>
                  </div>
                ) : (
                  <form action={customerPortalAction}>
                    <Button 
                      type="submit" 
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Gestionar Suscripción
                    </Button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No tienes una suscripción activa</p>
              <Button asChild className="bg-orange-600 hover:bg-orange-700">
                <a href="/pricing">Ver Planes Disponibles</a>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Team Members Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Miembros del Equipo</h2>
              <p className="text-sm text-gray-600">{user ? '1 miembro' : 'Sin miembros'}</p>
            </div>
          </div>
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            Invitar Miembro
          </Button>
        </div>

        <div className="space-y-3">
          {user ? (
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user.name 
                      ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                      : user.email.slice(0, 2).toUpperCase()
                    }
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.name || user.email}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-orange-50 text-orange-700">
                Propietario
              </Badge>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>No se pudo cargar información del usuario</p>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-1">Invitar Miembro del Equipo</h3>
              <p className="text-sm text-gray-600 mb-3">
                Invita a nuevos miembros para colaborar en tu equipo
              </p>
              <form action={inviteTeamMember} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    name="email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <select name="role" className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                    <option value="member">Miembro</option>
                    <option value="owner">Propietario</option>
                  </select>
                </div>
                <Button type="submit" size="sm" className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto">
                  Invitar Miembro
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
