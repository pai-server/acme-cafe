'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ShieldCheck, Clock, Coffee, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ProductDetails {
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval?: string;
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Obtener el paymentIntentId desde los parámetros de la URL
  const paymentIntentId = searchParams.get('paymentIntentId');
  
  const name = searchParams.get('name');
  const email = searchParams.get('email');
  const transactionId = searchParams.get('transactionId');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  
  // Estados para el formulario de tarjeta
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    async function fetchPaymentIntent() {
      if (!paymentIntentId) {
        setError('No se ha proporcionado un paymentIntentId válido');
        setIsLoading(false);
        return;
      }
      
      try {
        // Verificar si hay un status de éxito (viene después del pago)
        const status = searchParams.get('status');
        
        // Si ya tenemos un transactionId, significa que el pago ya fue procesado
        if (transactionId || status === 'success') {
          // Consultar Stripe para obtener el paymentIntent
          const response = await fetch(`/api/stripe/payment-intent/${paymentIntentId}`);
          if (!response.ok) {
            throw new Error('No se pudo obtener información del pago');
          }
          const paymentIntentData = await response.json();
          setPaymentIntent(paymentIntentData);
          
          // Usar los datos del paymentIntent para mostrar el éxito
          setProductDetails({
            name: paymentIntentData.description || 'Producto',
            description: paymentIntentData.description || '',
            amount: paymentIntentData.amount,
            currency: paymentIntentData.currency,
            interval: paymentIntentData.metadata?.interval || undefined
          });
          setPaymentSuccess(true);
          setIsLoading(false);
          return;
        }
        
        // Consultar Stripe para obtener el paymentIntent para mostrar el formulario
        const response = await fetch(`/api/stripe/payment-intent/${paymentIntentId}`);
        if (!response.ok) {
          throw new Error('No se pudo obtener información del pago');
        }
        const paymentIntentData = await response.json();
        setPaymentIntent(paymentIntentData);
        
        // Usar los datos del paymentIntent para mostrar el formulario
        setProductDetails({
          name: paymentIntentData.description || 'Producto',
          description: paymentIntentData.description || '',
          amount: paymentIntentData.amount,
          currency: paymentIntentData.currency,
          interval: paymentIntentData.metadata?.interval || undefined
        });
        
        // Pre-llenar los campos con los datos del checkout anterior
        if (name) setCardName(name);
        
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los detalles del producto');
        setIsLoading(false);
      }
    }
    
    fetchPaymentIntent();
  }, [paymentIntentId, transactionId, name, email, searchParams]);
  
  // Formatear número de tarjeta con espacios cada 4 dígitos
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
    if (value.length > 16) value = value.substr(0, 16);
    
    // Agregar espacios cada 4 dígitos
    const parts = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.substr(i, 4));
    }
    setCardNumber(parts.join(' ').trim());
  };
  
  // Formatear fecha de expiración con formato MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.substr(0, 4);
    
    if (value.length > 2) {
      value = value.substr(0, 2) + '/' + value.substr(2);
    }
    
    setCardExpiry(value);
  };
  
  // Limitar CVC a 3 o 4 dígitos
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.substr(0, 4);
    setCardCvc(value);
  };
  
  // Manejar el envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    // Validaciones básicas
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      setError('Número de tarjeta inválido');
      setSubmitting(false);
      return;
    }
    
    if (!cardExpiry || cardExpiry.length < 5) {
      setError('Fecha de expiración inválida');
      setSubmitting(false);
      return;
    }
    
    if (!cardCvc || cardCvc.length < 3) {
      setError('CVC inválido');
      setSubmitting(false);
      return;
    }
    
    if (!cardName) {
      setError('Por favor ingresa el nombre del titular');
      setSubmitting(false);
      return;
    }
    
    try {
      // Enviar datos al endpoint de procesamiento de pago real
      const response = await fetch('/api/custom-checkout/process-card-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          cardNumber: cardNumber.replace(/\s/g, ''),
          expiryDate: cardExpiry,
          cvv: cardCvc,
          cardholderName: cardName,
          amount: paymentIntent?.amount,
          currency: paymentIntent?.currency
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al procesar el pago');
      }

      // Si el pago fue exitoso, construir URL de redirección con éxito
      const currentUrl = new URL(window.location.href);
      const successUrl = new URL('/custom-checkout', currentUrl.origin);
      successUrl.searchParams.set('paymentIntentId', paymentIntentId!);
      successUrl.searchParams.set('status', 'success');
      
      if (name) successUrl.searchParams.set('name', name);
      if (email) successUrl.searchParams.set('email', email);
      
      // Usar el ID de transacción del endpoint
      successUrl.searchParams.set('transactionId', data.transactionId);
      
      // Redirigir a la página de éxito
      router.push(successUrl.toString());
      
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago');
      setSubmitting(false);
    }
  };
  
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
  if (error) {
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
  
  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };
  
  // Mostrar la confirmación de pago exitoso
  if (paymentSuccess && productDetails) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <div className="mb-6 text-green-500">
            <CheckCircle size={64} className="mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-green-700 mb-4">¡Pago Exitoso!</h1>
          <p className="text-gray-600 mb-2">Tu pago ha sido procesado correctamente.</p>
          <p className="text-gray-600 mb-6">ID de Transacción: <span className="font-mono">{transactionId}</span></p>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h2 className="font-bold mb-2">Detalles de la compra:</h2>
            <p><strong>Producto:</strong> {productDetails.name}</p>
            <p><strong>Precio:</strong> {formatMoney(productDetails.amount, productDetails.currency || 'MXN')}</p>
            {productDetails.interval && <p><strong>Periodicidad:</strong> {productDetails.interval}</p>}
          </div>
          
          <div className="flex justify-center">
            <Link href="/dashboard">
              <Button>
                Ir al dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }
  
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
        {/* Formulario de pago */}
        <div className="lg:col-span-7 order-1 lg:order-1">
          <Card className="p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Información de tu tarjeta</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Nombre en la tarjeta */}
                <div>
                  <Label htmlFor="card-name">Nombre en la tarjeta</Label>
                  <Input
                    id="card-name"
                    placeholder="Nombre completo como aparece en la tarjeta"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                
                {/* Número de tarjeta */}
                <div>
                  <Label htmlFor="card-number">Número de tarjeta</Label>
                  <Input
                    id="card-number"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="mt-1 font-mono"
                    required
                  />
                </div>
                
                {/* Fecha de expiración y CVC */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="card-expiry">Fecha de expiración</Label>
                    <Input
                      id="card-expiry"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      className="mt-1 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="card-cvc">CVC</Label>
                    <Input
                      id="card-cvc"
                      placeholder="123"
                      value={cardCvc}
                      onChange={handleCvcChange}
                      className="mt-1 font-mono"
                      required
                    />
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Procesando...
                    </>
                  ) : (
                    <>Pagar {productDetails ? formatMoney(productDetails.amount, productDetails.currency || 'MXN') : ''}</>
                  )}
                </Button>
                
                <div className="text-center text-xs text-gray-500 flex items-center justify-center space-x-2 mt-4">
                  <ShieldCheck size={16} />
                  <span>Pago seguro y encriptado</span>
                </div>
              </div>
            </form>
          </Card>
        </div>
        
        {/* Resumen de la compra */}
        <div className="lg:col-span-5 order-0 lg:order-2">
          <Card className="p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Resumen de compra</h2>
            
            {productDetails && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{productDetails.name}</span>
                  <span>{formatMoney(productDetails.amount, productDetails.currency || 'MXN')}</span>
                </div>
                {productDetails.interval && (
                  <div className="text-sm text-gray-500 mb-4">
                    Facturación {productDetails.interval}
                  </div>
                )}
              </div>
            )}
            
            <Separator className="my-4" />
            
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{productDetails ? formatMoney(productDetails.amount, productDetails.currency || 'MXN') : '-'}</span>
            </div>
            
            <div className="mt-6 space-y-3">
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <Coffee className="h-5 w-5 flex-shrink-0 text-orange-600" />
                <span>Acceso inmediato a todas las funciones premium</span>
              </div>
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <Clock className="h-5 w-5 flex-shrink-0 text-orange-600" />
                <span>Soporte técnico prioritario 24/7</span>
              </div>
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <ShieldCheck className="h-5 w-5 flex-shrink-0 text-orange-600" />
                <span>Garantía de devolución de 30 días</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
