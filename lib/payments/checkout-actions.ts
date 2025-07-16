'use server';

import { redirect } from 'next/navigation';
import { stripe } from './stripe';
import { getProducts } from '@/lib/db/auth-queries';
import { withTeam } from '@/lib/auth/middleware';
import Stripe from "stripe";

// Función para crear una intención de pago y preparar los datos para el checkout
export async function createPaymentIntent({ priceId, teamId }: { priceId: string; teamId?: number }) {
  try {
    // Obtener información del precio desde Stripe
    const price = await stripe.prices.retrieve(priceId, {
      expand: ['product']
    });

    if (!price || !price.active) {
      throw new Error('El precio no existe o no está activo');
    }

    const product = price.product as Stripe.Product;
    
    // Crear una intención de pago
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price.unit_amount || 0,
      currency: price.currency || 'mxn',
      // Guardar metadatos importantes para procesar después
      metadata: {
        priceId,
        productId: typeof product === 'string' ? product : product.id,
        teamId: teamId?.toString() || '',
        productName: typeof product !== 'string' ? product.name : '',
        interval: price.recurring?.interval || 'month',
      }
    });

    if (!paymentIntent || !paymentIntent.client_secret) {
      throw new Error('No se pudo crear la intención de pago');
    }

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntent,
      price,
      product: typeof product !== 'string' ? product : null
    };
  } catch (error) {
    console.error('Error al crear la intención de pago:', error);
    throw error;
  }
}

// Acción del servidor para iniciar el checkout personalizado
export const initiateCustomCheckout = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string;
  const trialPeriodDays = Number(formData.get('trialPeriodDays') as string);
  
  if (!priceId) {
    throw new Error('Se requiere un ID de precio válido');
  }
  
  // Redirigir a nuestra página de checkout personalizada con los parámetros necesarios
  redirect(`/checkout?priceId=${priceId}&trialDays=${trialPeriodDays}${team ? `&teamId=${team.id}` : ''}`);
});

// Función para obtener información completa del producto para mostrar en checkout
export async function getProductDetails(priceId: string) {
  try {
    // Buscar primero en la base de datos local
    const products = await getProducts();
    const localProduct = products.find(p =>
      p.prices.some(price => price.stripePriceId === priceId)
    );
    
    if (localProduct) {
      const price = localProduct.prices.find(p => p.stripePriceId === priceId);
      return {
        product: localProduct,
        price: price,
        fromDb: true
      };
    }
    
    // Si no se encuentra localmente, buscar en Stripe
    const stripePrice = await stripe.prices.retrieve(priceId, {
      expand: ['product']
    });
    
    const product = stripePrice.product as Stripe.Product;
    
    return {
      product: {
        name: product.name,
        description: product.description || '',
        image: product.images?.[0] || '',
        features: product.metadata?.features || '',
        stripeProductId: typeof product === 'string' ? product : product.id
      },
      price: {
        stripePriceId: stripePrice.id,
        unitAmount: stripePrice.unit_amount || 0,
        interval: stripePrice.recurring?.interval || 'month',
        currency: stripePrice.currency || 'mxn',
        trialPeriodDays: stripePrice.recurring?.trial_period_days || 0
      },
      fromDb: false
    };
  } catch (error) {
    console.error('Error al obtener detalles del producto:', error);
    return null;
  }
}
