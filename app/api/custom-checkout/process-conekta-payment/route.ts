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
          name: stripeCustomer.name || 'Cliente',
          email: stripeCustomer.email,
          metadata: {
            stripe_customer_id: stripeCustomer.id,
            source: 'custom_checkout'
          }
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
            token_id: token
          }
        }],
        metadata: {
          stripe_payment_intent_id: paymentIntent.id,
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: subscription.id,
          checkout_type: 'custom_subscription'
        }
      })
    });

    if (!conektaResponse.ok) {
      const errorData = await conektaResponse.json();
      console.error('Error de Conekta:', errorData);
      
      // Registra en Stripe el error de Conekta
      const paymentRecord = await stripe.paymentRecords.reportPayment({
        amount_requested: {
          value: errorData.data.amount,
          currency: errorData.data.currency
        },
        customer_details: {
          customer: stripeCustomer.id
        },
        payment_method_details: {
          custom: {
            type: 'cpmt_1RlIoSKqUi3Ta8kBZEgWbZAR',
          },
          type: 'custom',
        },
        initiated_at: errorData.data.created_at,
        customer_presence: 'on_session',
        payment_reference: errorData.data.id,
        outcome: 'failed',
        failed: {
          failed_at: errorData.data.updated_at
        }
      });
      
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
    
    // Crear método de pago personalizado en Stripe (funcionalidad experimental)
    // @ts-ignore - Usando funcionalidad experimental de Stripe
    const paymentMethod = await stripe.paymentMethods.create({
      // @ts-ignore - type 'custom' es experimental
      type: 'custom',
      // @ts-ignore - propiedad custom es experimental
      custom: {
        type: 'cpmt_1RlIoSKqUi3Ta8kBZEgWbZAR',
      },
      metadata: {
        conekta_order_id: order.id,
        conekta_charge_id: charge.id,
        external_id: `conekta_${charge.id}`,
        payment_processor: 'conekta'
      }
    });
    
    // Adjuntar el método de pago al customer
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: stripeCustomer.id
    });
    
    // Actualizar el método de pago por defecto de la suscripción
    await stripe.subscriptions.update(subscription.id, {
      default_payment_method: paymentMethod.id
    });

    // Reportar el pago exitoso a Stripe usando Payment Records en lugar de crear un payment method
    const paymentRecord = await stripe.paymentRecords.reportPayment({
      amount_requested: {
        value: paymentIntent.amount,
        currency: paymentIntent.currency || 'mxn'
      },
      payment_method_details: {
        type: 'custom',
        custom: {
          type: 'cpmt_1RlIoSKqUi3Ta8kBZEgWbZAR',
        }
      },
      customer_details: {
        customer: stripeCustomer.id
      },
      initiated_at: Math.floor(Date.now() / 1000),
      customer_presence: 'on_session',
      payment_reference: charge.id,
      outcome: 'guaranteed',
      guaranteed: {
        guaranteed_at: Math.floor(Date.now() / 1000)
      },
      metadata: {
        conekta_order_id: order.id,
        conekta_charge_id: charge.id,
        external_id: `conekta_${charge.id}`,
        payment_processor: 'conekta',
        paymentIntentId: paymentIntentId
      }
    });
    
    // Actualizar el invoice con el método de pago (funcionalidad experimental)
    // @ts-ignore - attachPayment es funcionalidad experimental
    await stripe.invoices.attachPayment(invoice.id, {
      // @ts-ignore - payment_record_data es experimental
      payment_record_data: {
        amount: charge.amount,
        currency: charge.currency,
        money_movement_type: 'out_of_band',
        paid_at: charge.paid_at,
        payment_method: paymentMethod.id,
        payment_reference: charge.id,
      }
    });
    
    // Marcar el invoice como pagado usando metadata
    await stripe.invoices.update(invoice.id, {
      metadata: {
        payment_processor: 'conekta',
        conekta_order_id: order.id,
        conekta_charge_id: charge.id,
        external_payment_id: charge.id,
        payment_status: 'paid',
        paid_at: Math.floor(Date.now() / 1000).toString()
      }
    });
    
    return NextResponse.json({
      success: true,
      transactionId: `conekta_${charge.id}`,
      paymentIntent: paymentIntent,
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
      message: 'Pago procesado exitosamente con Conekta'
    });

  } catch (error: any) {
    console.error('Error al procesar el pago con Conekta:', error);
    
    return NextResponse.json(
      { message: error.message || 'Error al procesar el pago' },
      { status: 500 }
    );
  }
}
