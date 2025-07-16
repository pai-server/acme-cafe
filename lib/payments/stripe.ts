import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { Team } from '@/lib/db/schema';
import {
  getTeamByStripeCustomerId,
  getUser,
  updateTeamSubscription
} from '@/lib/db/auth-queries';
import { isSubscriptionActive, getSubscriptionStatusText, subscriptionNeedsAttention } from '@/lib/payments/subscription-helpers';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.preview; payment_records_beta=v1;invoice_partial_payments_beta=v2' as any
});

export async function createCheckoutSession({
  team,
  priceId,
  trialPeriodDays
}: {
  team: Team | null;
  priceId: string;
  trialPeriodDays: number;
}) {
  const user = await getUser();

  if (!team || !user) {
    redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    mode: 'subscription',
    success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/pricing`,
    customer: team.stripeCustomerId || undefined,
    customer_email: team.stripeCustomerId ? undefined : user.email,
    client_reference_id: user.id.toString(),
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: trialPeriodDays
    }
  });

  redirect(session.url!);
}

export async function createCustomerPortalSession(team: Team) {
  if (!team.stripeCustomerId || !team.stripeProductId) {
    redirect('/pricing');
  }

  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await stripe.products.retrieve(team.stripeProductId);
    if (!product.active) {
      throw new Error("Team's product is not active in Stripe");
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the team's product");
    }

    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription'
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: product.id,
              prices: prices.data.map((price) => price.id)
            }
          ]
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other'
            ]
          }
        },
        payment_method_update: {
          enabled: true
        }
      }
    });
  }

      return stripe.billingPortal.sessions.create({
      customer: team.stripeCustomerId,
      return_url: `${process.env.BASE_URL}/settings`,
      configuration: configuration.id
    });
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const team = await getTeamByStripeCustomerId(customerId);

  if (!team) {
    console.error('Team not found for Stripe customer:', customerId);
    return;
  }

  const { id: stripeSubscriptionId, status } = subscription;
  const price = subscription.items.data[0]?.price;
  let productId: string | null = null;
  let planName: string | null = null;

  // Get product info if subscription is active/valid  
  if (isSubscriptionActive(status) && price?.product) {
    const stripeProductId = price.product as string;
    
    // Try to get product from local database first
    const { getProductByStripeId } = await import('@/lib/db/auth-queries');
    const localProduct = await getProductByStripeId(stripeProductId);
    
    if (localProduct) {
      productId = localProduct.stripeProductId;
      planName = localProduct.name;
    } else {
      // Fallback to Stripe API if not found locally
      const product = await stripe.products.retrieve(stripeProductId);
      productId = product.id;
      planName = product.name;
    }
  }

  await updateTeamSubscription(team.id, {
    stripeSubscriptionId: isSubscriptionActive(status) ? stripeSubscriptionId : null,
    stripeProductId: productId,
    planName: planName,
    subscriptionStatus: status
  });
}

export async function getStripePrices() {
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring'
  });

  return prices.data;
}

export async function getStripeProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price?.id
  }));
}

// Función para obtener productos con precios desde la base de datos local
export async function getProductsWithPrices() {
  const { getProducts } = await import('@/lib/db/auth-queries');
  return await getProducts();
}

// Función para obtener productos filtrados por intervalo de facturación
export async function getProductsByInterval(interval: 'month' | 'year') {
  const { getProductsWithPricesByInterval } = await import('@/lib/db/auth-queries');
  return await getProductsWithPricesByInterval(interval);
}

export async function getSubscriptionDetails(team: Team) {
  if (!team.stripeCustomerId || !team.stripeSubscriptionId) {
    return null;
  }

  try {
    // Get subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      team.stripeSubscriptionId,
      {
        expand: ['items.data.price.product']
      }
    ) as Stripe.Subscription;

    // Only return null if subscription doesn't exist or is permanently canceled/expired
    if (!subscription || 
        subscription.status === 'canceled' || 
        subscription.status === 'incomplete_expired') {
      return null;
    }

    const price = subscription.items.data[0]?.price;
    const product = price?.product as Stripe.Product;

    // Calculate trial days remaining
    let trialDaysRemaining = 0;
    if (subscription.trial_end && subscription.status === 'trialing') {
      const trialEndDate = new Date(subscription.trial_end * 1000);
      const now = new Date();
      trialDaysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Get next billing date from subscription item (Stripe API 2025-03-31.basil change)
    const firstItem = subscription.items.data[0];
    const nextBillingDate = firstItem?.current_period_end 
      ? new Date(firstItem.current_period_end * 1000)
      : null;
    
    let daysToNextDelivery = 0;
    if (nextBillingDate) {
      const now = new Date();
      daysToNextDelivery = Math.max(0, Math.ceil((nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Get invoice history to calculate delivery statistics
    let completedDeliveries = 0;
    let totalAmountPaid = 0;
    
    try {
      const invoices = await stripe.invoices.list({
        customer: team.stripeCustomerId,
        subscription: subscription.id,
        status: 'paid',
        limit: 100
      });
      
      completedDeliveries = invoices.data.length;
      totalAmountPaid = invoices.data.reduce((sum, invoice) => sum + (invoice.amount_paid || 0), 0);
    } catch (invoiceError) {
      console.warn('Error fetching invoice history:', invoiceError);
    }

    // Parse product metadata for features
    let features: any = {};
    if (product?.metadata) {
      try {
        features = JSON.parse(product.metadata.features || '{}');
      } catch (e) {
        console.warn('Failed to parse product features from metadata');
      }
    }

    // Determine if subscription needs attention and get status text
    const needsAttention = subscriptionNeedsAttention(subscription.status);
    const statusText = getSubscriptionStatusText(subscription.status);

    // Extract coffee amount from product metadata or name
    let coffeeAmount = features.coffeeAmount || '0g';
    if (!coffeeAmount || coffeeAmount === '0g') {
      // Try to extract from product name (e.g., "Plan Base - 250g" -> "250g")
      const match = product?.name?.match(/(\d+g)/);
      if (match) {
        coffeeAmount = match[1];
      }
    }

    return {
      id: subscription.id,
      status: subscription.status,
      statusText: statusText,
      needsAttention,
      productName: product?.name || 'Unknown Plan',
      priceAmount: price?.unit_amount || 0,
      currency: price?.currency?.toUpperCase() || 'MXN',
      interval: price?.recurring?.interval || 'month',
      trialDaysRemaining,
      nextBillingDate,
      daysToNextDelivery,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      features,
      // Coffee-specific features from metadata
      coffeeAmount,
      deliveryFrequency: features.deliveryFrequency || 'monthly',
      // Real delivery statistics
      completedDeliveries,
      totalAmountPaid: totalAmountPaid / 100, // Convert from cents
      // Customer details
      customerId: team.stripeCustomerId
    };
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return null;
  }
}

export async function getCustomerInvoices(team: Team, limit: number = 10) {
  if (!team.stripeCustomerId) {
    return [];
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: team.stripeCustomerId,
      limit,
      status: 'paid'
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency?.toUpperCase() || 'MXN',
      date: new Date(invoice.created * 1000),
      status: invoice.status,
      invoiceUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.invoice_pdf
    }));
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    return [];
  }
}

export async function getUnpaidInvoices(team: Team) {
  if (!team.stripeCustomerId) {
    return [];
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: team.stripeCustomerId,
      status: 'open',
      limit: 10
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency?.toUpperCase() || 'MXN',
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      status: invoice.status,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf
    }));
  } catch (error) {
    console.error('Error fetching unpaid invoices:', error);
    return [];
  }
}

export async function getLatestUnpaidInvoiceUrl(team: Team): Promise<string | null> {
  if (!team.stripeCustomerId) {
    return null;
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: team.stripeCustomerId,
      status: 'open',
      limit: 1
    });

    if (invoices.data.length > 0) {
      const invoice = invoices.data[0];
      return invoice.hosted_invoice_url || null;
    }

    return null;
  } catch (error) {
    console.error('Error fetching latest unpaid invoice:', error);
    return null;
  }
}

export async function createUnpaidInvoicePaymentSession(team: Team) {
  if (!team.stripeCustomerId) {
    throw new Error('Missing customer ID');
  }

  try {
    // Get the direct invoice URL - this is the best practice for unpaid invoices
    const invoiceUrl = await getLatestUnpaidInvoiceUrl(team);
    if (invoiceUrl) {
      return { url: invoiceUrl };
    }
    
    // If no unpaid invoice, fallback to regular portal
    return await createCustomerPortalSession(team);
  } catch (error) {
    console.error('Error getting unpaid invoice URL:', error);
    
    // Final fallback to regular portal session
    const portalSession = await createCustomerPortalSession(team);
    return portalSession;
  }
}

export async function reactivateSubscription(team: Team) {
  if (!team.stripeSubscriptionId) {
    throw new Error('Missing subscription ID');
  }

  try {
    // Update the subscription to remove the cancel_at_period_end flag
    const subscription = await stripe.subscriptions.update(
      team.stripeSubscriptionId,
      {
        cancel_at_period_end: false
      }
    );

    return {
      success: true,
      subscription
    };
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw error;
  }
}
