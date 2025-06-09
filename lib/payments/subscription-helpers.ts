import { SubscriptionStatus } from '@/lib/db/schema';

// Utility function to get status display text
export function getSubscriptionStatusText(status: string): string {
  switch (status) {
    case SubscriptionStatus.ACTIVE: return 'Activo';
    case SubscriptionStatus.TRIALING: return 'Período de prueba';
    case SubscriptionStatus.PAST_DUE: return 'Pago vencido';
    case SubscriptionStatus.UNPAID: return 'Sin pagar';
    case SubscriptionStatus.INCOMPLETE: return 'Incompleto';
    case SubscriptionStatus.INCOMPLETE_EXPIRED: return 'Expirado';
    case SubscriptionStatus.CANCELED: return 'Cancelado';
    case SubscriptionStatus.PAUSED: return 'Pausado';
    default: return status;
  }
}

// Check if status needs user attention
export function subscriptionNeedsAttention(status: string): boolean {
  return [
    SubscriptionStatus.PAST_DUE,
    SubscriptionStatus.UNPAID,
    SubscriptionStatus.INCOMPLETE
  ].includes(status as SubscriptionStatus);
}

// Check if subscription is considered active (can access services)
export function isSubscriptionActive(status: string): boolean {
  return [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIALING,
    SubscriptionStatus.PAST_DUE // Still active during grace period
  ].includes(status as SubscriptionStatus);
} 