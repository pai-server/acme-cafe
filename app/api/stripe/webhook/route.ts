import Stripe from 'stripe';
import { stripe } from '@/lib/payments/stripe';
import { processWebhookEvent } from '@/lib/payments/webhook-handlers';
import { NextRequest, NextResponse } from 'next/server';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed.' },
      { status: 400 }
    );
  }

  try {
    await processWebhookEvent(event);
    return NextResponse.json({ 
      received: true, 
      eventId: event.id,
      eventType: event.type 
    });
  } catch (error) {
    console.error('Error processing webhook event:', error);
    return NextResponse.json(
      { 
        error: 'Error processing webhook event',
        eventId: event.id,
        eventType: event.type
      },
      { status: 500 }
    );
  }
}
