import { NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import { getUser } from '@/lib/db/auth-queries';
import { db } from '@/lib/db/drizzle';
import { teams, users, teamMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    // Verificar autenticación del usuario
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Obtener datos del cuerpo de la solicitud
    const { paymentIntentId, priceId } = await request.json();
    
    if (!paymentIntentId || !priceId) {
      return NextResponse.json(
        { message: 'Se requieren ID de intención de pago y ID de precio' },
        { status: 400 }
      );
    }
    
    // Obtener la intención de pago desde Stripe para verificar su estado
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      {
        expand: ['payment_method']
      }
    );
    
    // Verificar que el pago fue completado
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { message: 'El pago aún no ha sido completado' },
        { status: 400 }
      );
    }
    
    // Obtener datos de los metadatos
    const { teamId, productId, interval, trialDays } = paymentIntent.metadata;
    
    // Crear o actualizar cliente en Stripe
    let team;
    let stripeCustomerId;
    
    if (teamId) {
      // Buscar equipo existente
      const results = await db
        .select()
        .from(teams)
        .where(eq(teams.id, parseInt(teamId)))
        .limit(1);
      
      if (results.length > 0) {
        team = results[0];
        stripeCustomerId = team.stripeCustomerId;
      }
    }
    
    // Si no hay equipo o cliente de Stripe, crear uno nuevo
    if (!stripeCustomerId) {
      // Buscar equipo asociado al usuario actual
      const userWithTeam = await db
        .select({
          user: users,
          team: teams
        })
        .from(users)
        .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
        .leftJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(eq(users.id, user.id))
        .limit(1);
      
      if (userWithTeam.length > 0 && userWithTeam[0].team) {
        team = userWithTeam[0].team;
        stripeCustomerId = team.stripeCustomerId;
      }
      
      // Si aún no hay cliente, crear uno nuevo en Stripe
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: {
            userId: user.id.toString()
          }
        });
        
        stripeCustomerId = customer.id;
        
        // Actualizar el equipo con el nuevo ID de cliente
        if (team) {
          await db
            .update(teams)
            .set({ stripeCustomerId })
            .where(eq(teams.id, team.id));
        }
      }
    }
    
    // Crear suscripción en Stripe
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      trial_period_days: parseInt(trialDays) || undefined,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: user.id.toString(),
        teamId: teamId || (team ? team.id.toString() : ''),
        source: 'custom_checkout'
      }
    });
    
    // Actualizar el equipo con la información de la suscripción
    if (team) {
      await db
        .update(teams)
        .set({
          stripeSubscriptionId: subscription.id,
          stripeProductId: productId,
          subscriptionStatus: subscription.status,
          planName: paymentIntent.metadata.productName
        })
        .where(eq(teams.id, team.id));
    }
    
    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      message: 'Suscripción creada exitosamente'
    });
  } catch (error: any) {
    console.error('Error al completar el pago:', error);
    
    return NextResponse.json(
      { message: error.message || 'Error al procesar el pago' },
      { status: 500 }
    );
  }
}
