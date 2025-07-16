'use client';

import React, { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useSearchParams } from 'next/navigation';
import CheckoutForm from './checkout-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, Clock, Coffee } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Cargar Stripe fuera del componente para evitar recreaciones
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const priceId = searchParams.get('priceId');
  const trialDays = searchParams.get('trialDays');
  
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [productDetails, setProductDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!priceId) {
      setError('No se ha especificado un plan para la compra');
      setIsLoading(false);
      return;
    }
    
    // Obtener el clientSecret para inicializar el PaymentElement
    const getPaymentIntent = async () => {
      try {
        const response = await fetch(`/api/checkout/create-payment?priceId=${priceId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al iniciar el proceso de pago');
        }
        
        const data = await response.json();
        setClientSecret(data.clientSecret);
        setProductDetails(data.productDetails);
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message || 'Error al procesar el pago');
      } finally {
        setIsLoading(false);
      }
    };
    
    getPaymentIntent();
  }, [priceId]);
  
  // Mostrar un indicador de carga mientras se inicializa
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg text-gray-600">Preparando tu pago...</p>
        </div>
      </div>
    );
  }
  
  // Mostrar mensaje de error si ocurre algún problema
  if (error || !priceId) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <div className="mb-6 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-700 mb-4">Error en el proceso de pago</h1>
          <p className="text-gray-600 mb-6">{error || 'No se ha podido iniciar el proceso de pago'}</p>
          <Link href="/pricing">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a planes
            </Button>
          </Link>
        </Card>
      </div>
    );
  }
  
  // Opciones de apariencia para el PaymentElement
  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#f97316',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };
  
  // Opciones para la configuración de Elements
  const options = {
    clientSecret,
    appearance,
    customPaymentMethods: [
      {
        id: 'cpmt_1RlIoSKqUi3Ta8kBZEgWbZAR',
        options: {
          type: 'static' as const,
          subtitle: 'Paga con tu tarjeta de crédito o débito',
        }
      }
    ]
  };
  
  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };
  
  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link href="/pricing" className="inline-flex items-center text-orange-600 hover:text-orange-700">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a planes
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Finaliza tu compra</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Resumen de compra */}
        <div className="lg:col-span-5 order-2 lg:order-1">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-8">
            <div className="p-6 bg-orange-50 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Resumen de tu pedido</h2>
            </div>
            
            {productDetails && (
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{productDetails.name}</h3>
                    <p className="text-sm text-gray-600">
                      {productDetails.interval === 'month' ? 'Facturación mensual' : 'Facturación anual'}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatMoney(productDetails.unitAmount, productDetails.currency)}
                    <span className="text-sm text-gray-500 font-normal">
                      {productDetails.interval === 'month' ? '/mes' : '/año'}
                    </span>
                  </p>
                </div>
                
                {Number(trialDays) > 0 && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-100 flex items-center">
                    <Clock className="h-5 w-5 text-green-600 mr-2" />
                    <p className="text-sm text-green-700">
                      <span className="font-semibold">Prueba gratuita de {trialDays} días</span> -
                      Tu primer pago será cobrado después del período de prueba.
                    </p>
                  </div>
                )}
                
                <Separator className="my-4" />
                
                <div className="space-y-1 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <Coffee className="h-4 w-4 mr-2 text-orange-500" />
                    Tu plan incluye:
                  </h4>
                  <ul className="space-y-2">
                    {productDetails.features && productDetails.features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600">
                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex items-center justify-between font-semibold text-lg text-gray-900">
                  <span>Total:</span>
                  <span>
                    {Number(trialDays) > 0
                      ? 'Gratis por ahora'
                      : formatMoney(productDetails.unitAmount, productDetails.currency)}
                  </span>
                </div>
                
                {Number(trialDays) > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Después de tu prueba gratuita, se te cobrará {formatMoney(productDetails.unitAmount, productDetails.currency)}
                    {productDetails.interval === 'month' ? ' mensualmente' : ' anualmente'}.
                  </p>
                )}
              </div>
            )}
            
            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <div className="flex items-center mb-4">
                <ShieldCheck className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Pago 100% seguro</span> - Usamos encriptación SSL
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Al completar esta compra, aceptas nuestros
                <Link href="#" className="text-orange-600 hover:text-orange-700"> Términos de Servicio</Link> y
                <Link href="#" className="text-orange-600 hover:text-orange-700"> Política de Privacidad</Link>.
              </p>
            </div>
          </div>
        </div>
        
        {/* Formulario de pago */}
        <div className="lg:col-span-7 order-1 lg:order-2">
          <Card className="p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Información de pago</h2>
            
            {clientSecret && (
              <Elements stripe={stripePromise} options={options}>
                <CheckoutForm
                  priceId={priceId}
                  trialDays={Number(trialDays || 0)}
                  productDetails={productDetails}
                  clientSecret={clientSecret}
                />
              </Elements>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
