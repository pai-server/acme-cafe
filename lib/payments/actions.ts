'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession, getLatestUnpaidInvoiceUrl, reactivateSubscription, createUnpaidInvoicePaymentSession } from './stripe';
import { withTeam } from '@/lib/auth/middleware';

export const checkoutAction = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string;
  const trialPeriodDays = Number(formData.get('trialPeriodDays') as string);
  await createCheckoutSession({ team: team, priceId, trialPeriodDays });
});

export const customerPortalAction = withTeam(async (_, team) => {
  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
});

export const payUnpaidInvoiceAction = withTeam(async (_, team) => {
  // Use the portal session with return URL configured for payment completion
  const portalSession = await createUnpaidInvoicePaymentSession(team);
  redirect(portalSession.url);
});

export const reactivateSubscriptionAction = withTeam(async (_, team) => {
  try {
    await reactivateSubscription(team);
    return { success: true, message: 'Suscripción reactivada exitosamente' };
  } catch (error) {
    console.error('Failed to reactivate subscription:', error);
    return { success: false, error: 'Error al reactivar la suscripción' };
  }
});
