'use server';

import Stripe from 'stripe';
import { db } from '@/lib/db/drizzle';
import { 
  webhookEvents, 
  subscriptionEvents,
  WebhookEventType,
  SubscriptionEventType,
  NewWebhookEvent,
  NewSubscriptionEvent
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { 
  getTeamByStripeCustomerId, 
  updateTeamSubscription 
} from '@/lib/db/auth-queries';
import { stripe } from './stripe';
import { isSubscriptionActive } from './subscription-helpers';

// Log webhook event for idempotency and debugging
export async function logWebhookEvent(
  stripeEventId: string,
  eventType: string,
  eventData: any,
  teamId?: number
): Promise<number> {
  const webhookEvent: NewWebhookEvent = {
    stripeEventId,
    eventType,
    eventData: JSON.stringify(eventData),
    teamId,
    attempts: 1,
    lastAttemptAt: new Date()
  };

  const result = await db.insert(webhookEvents).values(webhookEvent).returning({ id: webhookEvents.id });
  return result[0].id;
}

// Update webhook event status
export async function updateWebhookEventStatus(
  webhookEventId: number,
  status: 'success' | 'failed',
  errorMessage?: string
): Promise<void> {
  await db.update(webhookEvents)
    .set({
      processed: status,
      processedAt: status === 'success' ? new Date() : undefined,
      errorMessage,
      attempts: 1, // Will be incremented by trigger or separate query
      lastAttemptAt: new Date()
    })
    .where(eq(webhookEvents.id, webhookEventId));
}

// Log subscription event for history tracking
export async function logSubscriptionEvent(event: NewSubscriptionEvent): Promise<void> {
  await db.insert(subscriptionEvents).values(event);
}

// Main webhook event processor
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  console.log(`Processing webhook event: ${event.type} (${event.id})`);

  // Check if already processed (idempotency)
  const existing = await db.select()
    .from(webhookEvents)
    .where(and(
      eq(webhookEvents.stripeEventId, event.id),
      eq(webhookEvents.processed, 'success')
    ))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Event ${event.id} already processed, skipping`);
    return;
  }

  let webhookEventId: number | undefined;
  let teamId: number | undefined;

  try {
    // Extract team ID from event if possible
    teamId = await extractTeamIdFromEvent(event);
    
    // Log the event
    webhookEventId = await logWebhookEvent(event.id, event.type, event.data, teamId);

    // Process based on event type
    switch (event.type) {
      case WebhookEventType.SUBSCRIPTION_CREATED:
      case WebhookEventType.SUBSCRIPTION_UPDATED:
      case WebhookEventType.SUBSCRIPTION_DELETED:
        await handleSubscriptionEvent(event as Stripe.Event & { data: { object: Stripe.Subscription } });
        break;

      case WebhookEventType.SUBSCRIPTION_TRIAL_WILL_END:
        await handleTrialEndingEvent(event as Stripe.Event & { data: { object: Stripe.Subscription } });
        break;

      case WebhookEventType.INVOICE_PAYMENT_FAILED:
        await handlePaymentFailedEvent(event);
        break;

      case WebhookEventType.INVOICE_PAYMENT_SUCCEEDED:
      case WebhookEventType.INVOICE_PAID:
        await handlePaymentSucceededEvent(event);
        break;

      case WebhookEventType.CHECKOUT_SESSION_COMPLETED:
        await handleCheckoutCompletedEvent(event);
        break;

      case WebhookEventType.CUSTOMER_CREATED:
      case WebhookEventType.CUSTOMER_UPDATED:
        await handleCustomerEvent(event);
        break;

      case WebhookEventType.INVOICE_FINALIZED:
        await handleInvoiceFinalizedEvent(event);
        break;

      // Log but don't process these events for now
      case WebhookEventType.INVOICE_CREATED:
      case WebhookEventType.INVOICE_UPCOMING:
      case WebhookEventType.SETUP_INTENT_CREATED:
      case WebhookEventType.SETUP_INTENT_SUCCEEDED:
      case WebhookEventType.PAYMENT_METHOD_ATTACHED:
        console.log(`Event ${event.type} logged but not processed`);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark as successful
    if (webhookEventId) {
      await updateWebhookEventStatus(webhookEventId, 'success');
    }

    console.log(`Successfully processed webhook event: ${event.type} (${event.id})`);

  } catch (error) {
    console.error(`Error processing webhook event ${event.id}:`, error);
    
    if (webhookEventId) {
      await updateWebhookEventStatus(
        webhookEventId, 
        'failed', 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
    
    throw error; // Re-throw to ensure Stripe knows processing failed
  }
}

// Extract team ID from various event types
async function extractTeamIdFromEvent(event: Stripe.Event): Promise<number | undefined> {
  let customerId: string | undefined;

  switch (event.type) {
    case WebhookEventType.SUBSCRIPTION_CREATED:
    case WebhookEventType.SUBSCRIPTION_UPDATED:
    case WebhookEventType.SUBSCRIPTION_DELETED:
    case WebhookEventType.SUBSCRIPTION_TRIAL_WILL_END:
      customerId = (event.data.object as Stripe.Subscription).customer as string;
      break;

    case WebhookEventType.INVOICE_PAYMENT_FAILED:
    case WebhookEventType.INVOICE_PAYMENT_SUCCEEDED:
    case WebhookEventType.INVOICE_PAID:
    case WebhookEventType.INVOICE_FINALIZED:
      customerId = (event.data.object as Stripe.Invoice).customer as string;
      break;

    case WebhookEventType.CHECKOUT_SESSION_COMPLETED:
      customerId = (event.data.object as Stripe.Checkout.Session).customer as string;
      break;

    case WebhookEventType.CUSTOMER_CREATED:
    case WebhookEventType.CUSTOMER_UPDATED:
      customerId = (event.data.object as Stripe.Customer).id;
      break;
  }

  if (!customerId) return undefined;

  const team = await getTeamByStripeCustomerId(customerId);
  return team?.id;
}

// Handle subscription lifecycle events
async function handleSubscriptionEvent(event: Stripe.Event & { data: { object: Stripe.Subscription } }): Promise<void> {
  const subscription = event.data.object;
  const customerId = subscription.customer as string;
  
  const team = await getTeamByStripeCustomerId(customerId);
  if (!team) {
    console.warn(`Team not found for customer ${customerId} in subscription event`);
    return;
  }

  const previousStatus = team.subscriptionStatus;
  const newStatus = subscription.status;

  // Get product info if subscription is active/valid
  let productId: string | null = null;
  let planName: string | null = null;

  if (isSubscriptionActive(newStatus)) {
    const price = subscription.items.data[0]?.price;
    if (price?.product) {
      const product = await stripe.products.retrieve(price.product as string);
      productId = product.id;
      planName = product.name;
    }
  }

  // Update team subscription
  await updateTeamSubscription(team.id, {
    stripeSubscriptionId: subscription.id,
    stripeProductId: productId,
    planName: planName,
    subscriptionStatus: newStatus
  });

  // Log the subscription event
  await logSubscriptionEvent({
    teamId: team.id,
    eventType: SubscriptionEventType.STATUS_CHANGE,
    previousStatus,
    newStatus,
    stripeSubscriptionId: subscription.id,
    description: `Subscription status changed from ${previousStatus} to ${newStatus}`
  });

  console.log(`Updated subscription for team ${team.id}: ${previousStatus} -> ${newStatus}`);
}

// Handle trial ending notification
async function handleTrialEndingEvent(event: Stripe.Event & { data: { object: Stripe.Subscription } }): Promise<void> {
  const subscription = event.data.object;
  const customerId = subscription.customer as string;
  
  const team = await getTeamByStripeCustomerId(customerId);
  if (!team) return;

  // Log trial ending event
  await logSubscriptionEvent({
    teamId: team.id,
    eventType: SubscriptionEventType.TRIAL_ENDING,
    stripeSubscriptionId: subscription.id,
    description: 'Trial period ending soon',
    userNotified: 'pending'
  });

  // TODO: Send trial ending notification email
  console.log(`Trial ending for team ${team.id}, subscription ${subscription.id}`);
}

// Handle payment failure
async function handlePaymentFailedEvent(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;
  
  const team = await getTeamByStripeCustomerId(customerId);
  if (!team) return;

  // Log payment failure
  await logSubscriptionEvent({
    teamId: team.id,
    eventType: SubscriptionEventType.PAYMENT_FAILED,
    stripeSubscriptionId: (invoice as any).subscription || null,
    description: `Payment failed for invoice ${invoice.id}`,
    userNotified: 'pending'
  });

  // TODO: Send payment failure notification
  console.log(`Payment failed for team ${team.id}, invoice ${invoice.id}`);
}

// Handle successful payment
async function handlePaymentSucceededEvent(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;
  
  const team = await getTeamByStripeCustomerId(customerId);
  if (!team) return;

  // Log payment success
  await logSubscriptionEvent({
    teamId: team.id,
    eventType: SubscriptionEventType.PAYMENT_SUCCEEDED,
    stripeSubscriptionId: (invoice as any).subscription || null,
    description: `Payment succeeded for invoice ${invoice.id}`,
    userNotified: 'pending'
  });

  console.log(`Payment succeeded for team ${team.id}, invoice ${invoice.id}`);
}

// Handle checkout completion
async function handleCheckoutCompletedEvent(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  console.log(`Checkout completed: ${session.id} for customer ${session.customer}`);
  // Most handling will be done by subscription events
}

// Handle customer events
async function handleCustomerEvent(event: Stripe.Event): Promise<void> {
  const customer = event.data.object as Stripe.Customer;
  console.log(`Customer event ${event.type}: ${customer.id}`);
  // Log customer changes if needed
}

// Handle finalized invoice - Create charge in Conekta
async function handleInvoiceFinalizedEvent(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;
  
  console.log(`Processing invoice finalized event for invoice ${invoice.id}`);
  
  // Declarar subscriptionId al inicio para que esté disponible en toda la función
  let subscriptionId: string | null = null;
  
  try {
    // Obtener el cliente de Stripe con información expandida
    const stripeCustomer = await stripe.customers.retrieve(customerId);
    
    if (!stripeCustomer || stripeCustomer.deleted) {
      console.warn(`Customer ${customerId} not found or deleted`);
      return;
    }

    // Buscar el cliente en Conekta usando el stripe_customer_id en metadata
    let conektaCustomer;
    const existingCustomersResponse = await fetch(`https://api.conekta.io/customers?email=${encodeURIComponent(stripeCustomer.email || '')}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.CONEKTA_PRIVATE_KEY + ':').toString('base64')}`,
        'Accept': 'application/vnd.conekta-v2.0.0+json'
      }
    });

    if (existingCustomersResponse.ok) {
      const existingCustomers = await existingCustomersResponse.json();
      
      // Buscar customer que tenga el stripe_customer_id en metadata
      const matchingCustomer = existingCustomers.data?.find((customer: any) =>
        customer.metadata?.stripe_customer_id === stripeCustomer.id
      );
      
      if (matchingCustomer) {
        conektaCustomer = matchingCustomer;
        console.log('Cliente encontrado en Conekta:', conektaCustomer.id);
      }
    }

    if (!conektaCustomer) {
      console.warn(`No se encontró cliente en Conekta para Stripe customer ${customerId}`);
      return;
    }

    // Obtener los payment sources del cliente en Conekta
    const paymentSourcesResponse = await fetch(`https://api.conekta.io/customers/${conektaCustomer.id}/payment_sources`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.CONEKTA_PRIVATE_KEY + ':').toString('base64')}`,
        'Accept': 'application/vnd.conekta-v2.0.0+json'
      }
    });

    if (!paymentSourcesResponse.ok) {
      console.error('Error obteniendo payment sources de Conekta');
      return;
    }

    const paymentSources = await paymentSourcesResponse.json();

    // Obtener información de la suscripción si existe
    let validPaymentSource = null;
    
    // En Stripe Invoice, la suscripción puede ser string o null
    if ((invoice as any).subscription) {
      subscriptionId = (invoice as any).subscription as string;
      
      // 1. Obtener la suscripción de Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method']
      });
      
      if (subscription.default_payment_method) {
        // 2. Buscar el conekta_payment_source_id en el metadata
        const conektaPaymentSourceId = subscription.default_payment_method.metadata?.conekta_payment_source_id;
        
        if (conektaPaymentSourceId) {
          // 3. Buscar el payment source específico en Conekta
          validPaymentSource = paymentSources.data?.find((source: any) =>
            source.id === conektaPaymentSourceId
          );
          
          if (validPaymentSource) {
            console.log(`Método de pago encontrado en Conekta: ${validPaymentSource.id}`);
          } else {
            console.warn(`Payment source ${conektaPaymentSourceId} no encontrado en Conekta para customer ${conektaCustomer.id}`);
          }
        } else {
          console.warn(`No se encontró conekta_payment_source_id en metadata del método de pago ${subscription.default_payment_method.id}`);
        }
      } else {
        console.warn(`La suscripción ${subscriptionId} no tiene método de pago por defecto`);
      }
    }
    
    // Fallback: Buscar un payment source válido (usar el más reciente de tipo card)
    if (!validPaymentSource) {
      console.log('Usando fallback para buscar método de pago válido...');
      validPaymentSource = paymentSources.data?.find((source: any) =>
        source.type === 'card' &&
        source.metadata?.stripe_customer_id === stripeCustomer.id
      );
    }

    if (!validPaymentSource) {
      console.warn(`No se encontró método de pago válido en Conekta para customer ${conektaCustomer.id}`);
      return;
    }

    // Crear la orden en Conekta
    const conektaOrderData = {
      currency: (invoice.currency || 'MXN').toUpperCase(),
      customer_info: {
        customer_id: conektaCustomer.id
      },
      line_items: [{
        name: `Factura ${invoice.number || invoice.id}`,
        unit_price: invoice.amount_due, // Conekta usa centavos
        quantity: 1,
        metadata: {
          stripe_invoice_id: invoice.id,
          stripe_customer_id: stripeCustomer.id,
          stripe_subscription_id: subscriptionId,
          webhook_source: 'invoice_finalized'
        }
      }],
      charges: [{
        payment_method: {
          type: 'card',
          payment_source_id: validPaymentSource.id
        }
      }],
      metadata: {
        stripe_invoice_id: invoice.id,
        stripe_customer_id: stripeCustomer.id,
        stripe_subscription_id: subscriptionId,
        conekta_customer_id: conektaCustomer.id,
        conekta_payment_source_id: validPaymentSource.id,
        webhook_source: 'invoice_finalized',
        invoice_number: invoice.number || invoice.id
      }
    };

    const conektaResponse = await fetch('https://api.conekta.io/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(process.env.CONEKTA_PRIVATE_KEY + ':').toString('base64')}`,
        'Accept': 'application/vnd.conekta-v2.0.0+json'
      },
      body: JSON.stringify(conektaOrderData)
    });

    if (!conektaResponse.ok) {
      const errorData = await conektaResponse.json();
      console.error('Error creando orden en Conekta:', errorData);
      throw new Error(`Error de Conekta: ${errorData.message || 'Error desconocido'}`);
    }

    const order = await conektaResponse.json();

    // Verificar que el pago fue procesado
    if (!order.charges || order.charges.data.length === 0) {
      throw new Error('No se generaron cargos en la orden de Conekta');
    }

    const charge = order.charges.data[0];
    
    console.log(`Cargo creado en Conekta: ${charge.id} para factura ${invoice.id}`);
    console.log(`Estado del cargo: ${charge.status}`);
    console.log(`Monto: ${charge.amount} ${charge.currency}`);

    // Log subscription event para tracking
    const team = await getTeamByStripeCustomerId(customerId);
    if (team) {
      await logSubscriptionEvent({
        teamId: team.id,
        eventType: SubscriptionEventType.PAYMENT_SUCCEEDED,
        stripeSubscriptionId: subscriptionId,
        description: `Cargo creado en Conekta ${charge.id} para factura ${invoice.id}`,
        userNotified: 'pending'
      });
    }

  } catch (error) {
    console.error(`Error procesando factura finalizada ${invoice.id}:`, error);
    
    // Log subscription event para tracking del error
    const team = await getTeamByStripeCustomerId(customerId);
    if (team) {
      await logSubscriptionEvent({
        teamId: team.id,
        eventType: SubscriptionEventType.PAYMENT_FAILED,
        stripeSubscriptionId: subscriptionId,
        description: `Error creando cargo en Conekta para factura ${invoice.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        userNotified: 'pending'
      });
    }
    
    throw error; // Re-throw para que el webhook falle y se reintente
  }
}
