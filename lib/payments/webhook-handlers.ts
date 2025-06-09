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

      // Log but don't process these events for now
      case WebhookEventType.INVOICE_CREATED:
      case WebhookEventType.INVOICE_FINALIZED:
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