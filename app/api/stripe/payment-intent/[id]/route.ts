import { NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const paymentIntentId = params.id;
    
    if (!paymentIntentId) {
      return NextResponse.json(
        { message: 'PaymentIntent ID es requerido' },
        { status: 400 }
      );
    }

    // Consultar el PaymentIntent en Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    return NextResponse.json(paymentIntent);
    
  } catch (error: any) {
    console.error('Error al obtener PaymentIntent:', error);
    
    return NextResponse.json(
      { message: error.message || 'Error al obtener información del pago' },
      { status: 500 }
    );
  }
}
