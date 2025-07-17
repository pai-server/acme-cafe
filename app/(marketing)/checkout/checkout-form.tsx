'use client';

import { useState } from 'react';
import { useStripe, useElements, PaymentElement, AddressElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CheckoutFormProps {
  priceId: string;
  trialDays: number;
  productDetails: any;
  clientSecret: string;
}

export default function CheckoutForm({ priceId, trialDays, productDetails, clientSecret }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js no se ha cargado aún
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Confirmar el pago
      const { error } = await elements.submit();
      if (error) {
        setMessage(error.message || 'Error en la validación del formulario');
        setIsLoading(false);
        return;
      }

      // Obtener los datos del formulario
      const nameInput = document.querySelector('#name') as HTMLInputElement;
      const emailInput = document.querySelector('#email') as HTMLInputElement;
      const customerName = nameInput?.value || 'Cliente';
      const customerEmail = emailInput?.value;

      // Verificar si se seleccionó el método de pago personalizado
      // Esto es solo un ejemplo - ajusta según cómo determines el método personalizado
      const formData = new FormData();
      const paymentElement = elements.getElement('payment');
      
      // Si el usuario quiere usar el checkout personalizado, redirigir ahí
      // Por ahora, vamos a asumir que si hay un parámetro específico o condición, usamos custom checkout
      const paymentIntent = await stripe.retrievePaymentIntent(clientSecret);
      const { selectedPaymentMethod } = await elements.submit();
      const useCustomCheckout = selectedPaymentMethod == 'cpmt_1RlIoSKqUi3Ta8kBZEgWbZAR';
      
      if (useCustomCheckout) {
        // Verificar que el paymentIntent existe
        if (!paymentIntent.paymentIntent) {
          throw new Error('No se pudo obtener la información del payment intent');
        }
        
        // Crear confirmation token
        //const confirmationToken = await stripe.createConfirmationToken({elements});
        
        // Procesar pago usando el endpoint personalizado - enviar solo el ID del paymentIntent
        const res = await fetch("/api/custom-checkout/process-payment", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.paymentIntent.id,
            name: customerName,
            email: customerEmail,
          }),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Error al procesar el pago personalizado');
        }
        
        // Obtener la URL de redirección de la respuesta
        const result = await res.json();
        
        if (result.redirectUrl) {
          // Redirigir a la página de checkout personalizado
          setIsSuccess(true);
          setMessage('Redirigiendo al formulario de pago personalizado...');
          
          // Redirigir usando la URL proporcionada por el backend
          setTimeout(() => {
            router.push(result.redirectUrl);
          }, 1000);
          
          return;
        } else {
          throw new Error('No se recibió una URL de redirección válida');
        }
      } else {
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/dashboard`,
            payment_method_data: {
              billing_details: {
                name: (document.querySelector('#name') as HTMLInputElement)?.value || 'Cliente',
              },
            },
            receipt_email: (document.querySelector('#email') as HTMLInputElement)?.value,
          },
          redirect: 'if_required'
        });
        
        // Si el pago se completó sin redirección externa
        if (paymentIntent && paymentIntent.status === 'succeeded') {
          setIsSuccess(true);
          setMessage('¡Pago completado con éxito! Redirigiendo...');
          
          // Notificar al servidor que el pago fue completado
          await fetch('/api/checkout/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              priceId,
            }),
          });
          
          // Redirigir al dashboard después de un breve delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
          
          return;
        }
        
        // Si hay un error con el pago
        if (error) {
          if (error.type === 'card_error' || error.type === 'validation_error') {
            setMessage(error.message || 'Ha ocurrido un error con el pago');
          } else {
            setMessage('Ha ocurrido un error inesperado');
          }
        }
      }
    } catch (err: any) {
      setMessage(err.message || 'Ha ocurrido un error al procesar el pago');
      console.error('Error al procesar el pago:', err);
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo
          </label>
          <input
            id="name"
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            placeholder="Tu nombre"
            required
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            placeholder="tu@email.com"
            required
          />
        </div>
        
        <div className="pt-2 pb-4">
          <p className="text-sm font-medium text-gray-700 mb-4">
            Información de tarjeta
          </p>
          <PaymentElement />
        </div>
        
        {message && (
          <div className={`p-4 rounded-md ${isSuccess ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}
        
        <Button
          type="submit"
          className="w-full h-12 text-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
          disabled={!stripe || isLoading || isSuccess}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : isSuccess ? (
            'Pago Completado ��'
          ) : trialDays > 0 ? (
            `Comenzar Período de Prueba Gratis`
          ) : (
            `Pagar ${new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: productDetails?.currency?.toUpperCase() || 'MXN'
            }).format(productDetails?.unitAmount / 100 || 0)}`
          )}
        </Button>
        
        {trialDays > 0 && (
          <p className="text-sm text-gray-500 text-center">
            No se te cobrará nada hoy. Tu primer pago será después del período de prueba.
          </p>
        )}
      </div>
    </form>
  );
}
