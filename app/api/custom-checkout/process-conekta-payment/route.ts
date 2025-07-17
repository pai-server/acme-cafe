import { NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      paymentIntentId,
      token
    } = body;
    
    // Validar datos requeridos
    if (!paymentIntentId || !token) {
      return NextResponse.json(
        { message: 'PaymentIntentId y token son requeridos' },
        { status: 400 }
      );
    }

    // Obtener el PaymentIntent original de Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['customer']
    });
    
    if (!paymentIntent) {
      return NextResponse.json(
        { message: 'PaymentIntent no encontrado' },
        { status: 404 }
      );
    }

    // Obtener datos del cliente desde Stripe
    const stripeCustomer = paymentIntent.customer as any;
    
    if (!stripeCustomer) {
      return NextResponse.json(
        { message: 'No se encontró información del cliente' },
        { status: 400 }
      );
    }

    // Obtener la última suscripción incompleta del cliente
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomer.id,
      status: 'incomplete',
      limit: 1,
      expand: ['data.latest_invoice']
    });
    
    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { message: 'No se encontró suscripción incompleta para este cliente' },
        { status: 404 }
      );
    }
    
    const subscription = subscriptions.data[0];
    const invoice = subscription.latest_invoice as any;
    
    if (!invoice) {
      return NextResponse.json(
        { message: 'No se encontró invoice en la suscripción' },
        { status: 404 }
      );
    }

    // Usar API REST de Conekta directamente
    
    // 1. Verificar si el customer ya existe en Conekta
    let conektaCustomer;
    let existingCustomerId = null;
    
    // Buscar customer existente por email
    const existingCustomersResponse = await fetch(`https://api.conekta.io/customers?email=${encodeURIComponent(stripeCustomer.email)}`, {
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
        existingCustomerId = matchingCustomer.id;
        console.log('Customer existente encontrado en Conekta:', existingCustomerId);
      }
    }
    
    // Si no existe, crear customer en Conekta
    if (!conektaCustomer) {
      const conektaCustomerResponse = await fetch('https://api.conekta.io/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(process.env.CONEKTA_PRIVATE_KEY + ':').toString('base64')}`,
          'Accept': 'application/vnd.conekta-v2.0.0+json'
        },
        body: JSON.stringify({
          name: stripeCustomer.name || 'Cliente',
          email: stripeCustomer.email,
          phone: stripeCustomer.phone || undefined,
          metadata: {
            stripe_customer_id: stripeCustomer.id,
            stripe_payment_intent_id: paymentIntent.id,
            stripe_subscription_id: subscription.id,
            source: 'custom_checkout'
          }
        })
      });

      if (!conektaCustomerResponse.ok) {
        const customerError = await conektaCustomerResponse.json();
        console.error('Error creando customer en Conekta:', customerError);
        return NextResponse.json(
          { message: 'Error al crear el cliente en Conekta' },
          { status: 400 }
        );
      }

      conektaCustomer = await conektaCustomerResponse.json();
      console.log('Nuevo customer creado en Conekta:', conektaCustomer.id);
    }

    // 2. Verificar si ya existe un payment source para este token/tarjeta
    let paymentSource;
    let existingPaymentSourceId = null;
    
    // Obtener payment sources existentes del customer
    const paymentSourcesResponse = await fetch(`https://api.conekta.io/customers/${conektaCustomer.id}/payment_sources`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.CONEKTA_PRIVATE_KEY + ':').toString('base64')}`,
        'Accept': 'application/vnd.conekta-v2.0.0+json'
      }
    });

    if (paymentSourcesResponse.ok) {
      const paymentSources = await paymentSourcesResponse.json();
      
      // Buscar payment source que tenga el mismo stripe_payment_intent_id en metadata
      // o que sea del mismo tipo y tenga características similares
      const matchingPaymentSource = paymentSources.data?.find((source: any) =>
        source.metadata?.stripe_payment_intent_id === paymentIntent.id ||
        (source.type === 'card' && source.metadata?.stripe_customer_id === stripeCustomer.id)
      );
      
      if (matchingPaymentSource) {
        paymentSource = matchingPaymentSource;
        existingPaymentSourceId = matchingPaymentSource.id;
        console.log('Payment source existente encontrado en Conekta:', existingPaymentSourceId);
      }
    }
    
    // Si no existe, crear y adjuntar el método de pago al customer de Conekta
    if (!paymentSource) {
      const paymentSourceResponse = await fetch(`https://api.conekta.io/customers/${conektaCustomer.id}/payment_sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(process.env.CONEKTA_PRIVATE_KEY + ':').toString('base64')}`,
          'Accept': 'application/vnd.conekta-v2.0.0+json'
        },
        body: JSON.stringify({
          type: 'card',
          token_id: token,
          metadata: {
            stripe_customer_id: stripeCustomer.id,
            stripe_payment_intent_id: paymentIntent.id,
            stripe_invoice_id: invoice.id,
            created_for: 'custom_checkout'
          }
        })
      });

      if (!paymentSourceResponse.ok) {
        const paymentSourceError = await paymentSourceResponse.json();
        console.error('Error adjuntando método de pago en Conekta:', paymentSourceError);
        return NextResponse.json(
          { message: 'Error al adjuntar el método de pago en Conekta' },
          { status: 400 }
        );
      }

      paymentSource = await paymentSourceResponse.json();
      console.log('Nuevo método de pago adjuntado en Conekta:', paymentSource.id);
    }

    // 3. Crear la orden en Conekta usando el customer y método de pago existentes
    const conektaResponse = await fetch('https://api.conekta.io/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(process.env.CONEKTA_PRIVATE_KEY + ':').toString('base64')}`,
        'Accept': 'application/vnd.conekta-v2.0.0+json'
      },
      body: JSON.stringify({
        currency: (paymentIntent.currency || 'MXN').toUpperCase(),
        customer_info: {
          customer_id: conektaCustomer.id  // Usar el customer ya creado
        },
        line_items: [{
          name: paymentIntent.description || 'Suscripción Premium',
          unit_price: paymentIntent.amount, // Conekta usa centavos
          quantity: 1,
          metadata: {
            stripe_payment_intent_id: paymentIntent.id,
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: subscription.id
          }
        }],
        charges: [{
          payment_method: {
            type: 'card',
            payment_source_id: paymentSource.id  // Usar el payment source adjuntado
          }
        }],
        metadata: {
          stripe_payment_intent_id: paymentIntent.id,
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: stripeCustomer.id,
          conekta_customer_id: conektaCustomer.id,
          conekta_payment_source_id: paymentSource.id,
          checkout_type: 'custom_subscription'
        }
      })
    });

    if (!conektaResponse.ok) {
      const errorData = await conektaResponse.json();
      console.error('Error de Conekta:', errorData);
      
      // Manejar errores específicos de Conekta
      if (errorData.type === 'card_declined') {
        return NextResponse.json(
          { message: 'Tarjeta declinada. Por favor, verifica tus datos o intenta con otra tarjeta.' },
          { status: 400 }
        );
      }
      
      if (errorData.type === 'insufficient_funds') {
        return NextResponse.json(
          { message: 'Fondos insuficientes en la tarjeta.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { message: errorData.message || 'Error al procesar el pago con Conekta' },
        { status: 400 }
      );
    }

    const order = await conektaResponse.json();

    // Verificar que el pago fue exitoso
    if (!order.charges || order.charges.data.length === 0 || order.charges.data[0].status !== 'paid') {
      return NextResponse.json(
        { message: 'El pago no pudo ser procesado' },
        { status: 400 }
      );
    }

    const charge = order.charges.data[0];
    
    // El webhook de Conekta se encargará de notificar a Stripe
    // cuando reciba el evento charge.paid o charge.declined
    
    return NextResponse.json({
      success: true,
      transactionId: `conekta_${charge.id}`,
      conektaOrder: {
        id: order.id,
        status: order.payment_status
      },
      conektaCharge: {
        id: charge.id,
        status: charge.status,
        amount: charge.amount,
        currency: charge.currency
      },
      message: 'Pago enviado a Conekta - se procesará vía webhook'
    });

  } catch (error: any) {
    console.error('Error al procesar el pago con Conekta:', error);
    
    return NextResponse.json(
      { message: error.message || 'Error al procesar el pago' },
      { status: 500 }
    );
  }
}
