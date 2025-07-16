import { NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import { getProductDetails } from '@/lib/payments/checkout-actions';
import { getUser } from '@/lib/db/auth-queries';
import { db } from '@/lib/db/drizzle';
import { teams, users, teamMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    // Verificar autenticación del usuario
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { message: 'No autorizado. Debes iniciar sesión para continuar.' },
        { status: 401 }
      );
    }

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

    // Crear o obtener el customer de Stripe
    let stripeCustomerId: string;
    let team: any = null;

    // Si se proporciona teamId, buscar el equipo existente
    if (teamId) {
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

    // Si no hay equipo específico, buscar el equipo del usuario actual
    if (!team) {
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
    }

    // Si no existe customer en Stripe, crear uno nuevo
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id.toString(),
          teamId: team?.id?.toString() || ''
        }
      });
      
      stripeCustomerId = customer.id;
      
      // Si existe un equipo, actualizar con el nuevo customer ID
      if (team) {
        await db
          .update(teams)
          .set({ stripeCustomerId })
          .where(eq(teams.id, team.id));
      }
    }
    
    // Verificar si el cliente ya tiene una suscripción incompleta
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'incomplete',
      limit: 1,
      expand: ['data.latest_invoice.confirmation_secret']
    });

    let subscription;
    
    if (existingSubscriptions.data.length > 0) {
      // Usar la suscripción incompleta existente
      subscription = existingSubscriptions.data[0];
      console.log('Usando suscripción incompleta existente:', subscription.id);
    } else {
      // Crear una suscripción incompleta con el customer asociado
      subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.confirmation_secret'],
        // Guardar metadatos importantes para procesar después
        metadata: {
          priceId,
          productId: productInfo.product.stripeProductId,
          teamId: team?.id?.toString() || '',
          productName: productInfo.product.name,
          interval: productInfo.price.interval,
          userId: user.id.toString()
        }
      });
      console.log('Nueva suscripción creada:', subscription.id);
    }

    if (!subscription || !subscription.latest_invoice) {
      return NextResponse.json(
        { message: 'No se pudo crear la suscripción' },
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
      clientSecret: subscription.latest_invoice.confirmation_secret.client_secret,
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
