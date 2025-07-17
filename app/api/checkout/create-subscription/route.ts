import { NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import { getProductDetails } from '@/lib/payments/checkout-actions';

export async function GET(request: Request) {
  try {
    // Obtener el ID del precio de los parámetros de consulta
    const url = new URL(request.url);
    const priceId = url.searchParams.get('priceId');
    const teamId = url.searchParams.get('teamId');
    
    if (!priceId) {
      return NextResponse.json(
        { message: 'Se requiere un ID de precio válido' },
        { status: 400 }
      );
    }
    
    // Obtener detalles del producto
    const productInfo = await getProductDetails(priceId);
    
    if (!productInfo || !productInfo.price) {
      return NextResponse.json(
        { message: 'No se encontró el producto o precio especificado' },
        { status: 404 }
      );
    }
    
    // Crear una intención de pago con Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: productInfo.price.unitAmount,
      currency: productInfo.price.currency,
      // Guardar metadatos importantes para procesar después
      metadata: {
        priceId,
        productId: productInfo.product.stripeProductId,
        teamId: teamId || '',
        productName: productInfo.product.name,
        interval: productInfo.price.interval,
        trialDays: productInfo.price.trialPeriodDays?.toString() || '0'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    if (!paymentIntent || !paymentIntent.client_secret) {
      return NextResponse.json(
        { message: 'No se pudo crear la intención de pago' },
        { status: 500 }
      );
    }
    
    // Preparar detalles del producto para el frontend
    let features: string[] = [];
    try {
      features = productInfo.product.features ?
        JSON.parse(productInfo.product.features) :
        productInfo.product.features?.split(';') || [];
    } catch (e) {
      features = productInfo.product.features?.split(';') || [];
    }
    
    // Devolver el clientSecret y detalles del producto
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      productDetails: {
        name: productInfo.product.name,
        description: productInfo.product.description,
        unitAmount: productInfo.price.unitAmount,
        currency: productInfo.price.currency,
        interval: productInfo.price.interval,
        features: features,
        trialDays: productInfo.price.trialPeriodDays
      }
    });
  } catch (error: any) {
    console.error('Error al crear la intención de pago:', error);
    
    return NextResponse.json(
      { message: error.message || 'Error al procesar la solicitud de pago' },
      { status: 500 }
    );
  }
}
