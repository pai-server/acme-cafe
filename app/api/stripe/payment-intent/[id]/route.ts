import { NextRequest } from 'next/server';
import { stripe } from '@/lib/payments/stripe';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const paymentIntent = await stripe.paymentIntents.retrieve(id);
    
    return Response.json({ paymentIntent });
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    return Response.json(
      { error: 'Failed to retrieve payment intent' },
      { status: 500 }
    );
  }
}
