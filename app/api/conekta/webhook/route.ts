import { NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('Webhook-Signature');
    
    // Verificar la firma del webhook de Conekta (comentado para testing)
    // if (!signature) {
    //   console.error('Missing Conekta webhook signature');
    //   return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    // }
    
    // // Validar la firma del webhook
    // const expectedSignature = crypto
    //   .createHmac('sha256', process.env.CONEKTA_WEBHOOK_SECRET!)
    //   .update(body)
    //   .digest('hex');
    
    // if (signature !== expectedSignature) {
    //   console.error('Invalid Conekta webhook signature');
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }
    
    const event = JSON.parse(body);
    console.log('Conekta webhook event received:', event.type);
    
    switch (event.type) {
      case 'order.paid':
        await handleOrderPaid(event.data);
        break;
        
      case 'order.declined':
        await handleOrderDeclined(event.data);
        break;
        
      default:
        console.log(`Unhandled Conekta event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error: any) {
    console.error('Error processing Conekta webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleOrderPaid(order: any) {
  try {
    order = order.object;
    console.log('Processing order.paid event:', order.id);
    
    // Verificar que el order tenga charges
    if (!order.charges || order.charges.data.length === 0) {
      console.error('No charges found in order data');
      return;
    }
    
    const charge = order.charges.data[0];
    
    // Extraer información de Stripe desde metadata
    const stripePaymentIntentId = order.metadata?.stripe_payment_intent_id;
    const stripeCustomerId = order.metadata?.stripe_customer_id;
    const stripeInvoiceId = order.metadata?.stripe_invoice_id;
    const stripeSubscriptionId = order.metadata?.stripe_subscription_id;
    
    if (!stripePaymentIntentId || !stripeCustomerId) {
      console.error('Missing Stripe metadata in order');
      return;
    }
    
    // Obtener información de Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    
    // Verificar si ya existe un método de pago en Stripe para este cargo de Conekta
    let paymentMethod;
    let existingPaymentMethodId = null;
    
    // Buscar payment methods existentes del customer en Stripe
    const existingPaymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'custom'
    });
    
    // Buscar payment method que tenga el mismo conekta_charge_id en metadata
    const matchingPaymentMethod = existingPaymentMethods.data.find((pm) =>
      pm.metadata?.conekta_charge_id === charge.id ||
      pm.metadata?.conekta_order_id === order.id ||
      (pm.metadata?.payment_processor === 'conekta' && pm.metadata?.external_id === `conekta_${charge.id}`)
    );
    
    if (matchingPaymentMethod) {
      paymentMethod = matchingPaymentMethod;
      existingPaymentMethodId = matchingPaymentMethod.id;
      console.log('Payment method existente encontrado en Stripe:', existingPaymentMethodId);
    } else {
      // Crear método de pago personalizado en Stripe
      paymentMethod = await stripe.paymentMethods.create({
        type: 'custom',
        custom: {
          type: 'cpmt_1RlIoSKqUi3Ta8kBZEgWbZAR',
        },
        metadata: {
          conekta_order_id: order.id,
          conekta_charge_id: charge.id,
          external_id: `conekta_${charge.id}`,
          payment_processor: 'conekta',
          conekta_customer_id: order.metadata?.conekta_customer_id,
          conekta_payment_source_id: order.metadata?.conekta_payment_source_id
        }
      });
      
      // Adjuntar el método de pago al customer
      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: stripeCustomerId
      });
      
      console.log('Nuevo payment method creado en Stripe:', paymentMethod.id);
    }
    
    // Actualizar suscripción si existe
    if (stripeSubscriptionId) {
      await stripe.subscriptions.update(stripeSubscriptionId, {
        default_payment_method: paymentMethod.id
      });
    }

    // Reportar el pago exitoso a Stripe usando Payment Records
    const paymentRecord = await stripe.paymentRecords.reportPayment({
      amount_requested: {
        value: charge.amount,
        currency: charge.currency || 'mxn'
      },
      payment_method_details: {
        type: 'custom',
        custom: {
          type: 'cpmt_1RlIoSKqUi3Ta8kBZEgWbZAR',
        }
      },
      customer_details: {
        customer: stripeCustomerId
      },
      initiated_at: Math.floor(new Date(charge.created_at).getTime() / 1000),
      customer_presence: 'on_session',
      payment_reference: charge.id,
      outcome: 'guaranteed',
      guaranteed: {
        guaranteed_at: Math.floor(new Date(charge.paid_at).getTime() / 1000)
      },
      metadata: {
        conekta_order_id: order.id,
        conekta_charge_id: charge.id,
        external_id: `conekta_${charge.id}`,
        payment_processor: 'conekta',
        webhook_processed: 'true'
      }
    });
    
    // Actualizar invoice si existe
    if (stripeInvoiceId) {
      try {
        await stripe.invoices.update(stripeInvoiceId, {
          metadata: {
            payment_processor: 'conekta',
            conekta_order_id: order.id,
            conekta_charge_id: charge.id,
            external_payment_id: charge.id,
            payment_status: 'paid',
            paid_at: Math.floor(new Date(charge.paid_at).getTime() / 1000).toString(),
            webhook_processed: 'true'
          }
        });
        
        // Intentar adjuntar el pago al invoice
        await stripe.invoices.attachPayment(stripeInvoiceId, {
          payment_record_data: {
            amount: charge.amount,
            currency: charge.currency,
            money_movement_type: 'out_of_band',
            paid_at: Math.floor(new Date(charge.paid_at).getTime() / 1000),
            payment_method: paymentMethod.id,
            payment_reference: charge.id,
          }
        });
      } catch (invoiceError) {
        console.warn('Error updating invoice:', invoiceError);
        // Continuar aunque falle la actualización del invoice
      }
    }
    
    console.log('Successfully processed order.paid event:', order.id);
    
  } catch (error) {
    console.error('Error handling order.paid:', error);
    throw error;
  }
}

async function handleOrderDeclined(order: any) {
  try {
    console.log('Processing order.declined event:', order.id);
    
    // Verificar que el order tenga charges
    if (!order.charges || order.charges.data.length === 0) {
      console.error('No charges found in order data');
      return;
    }
    
    const charge = order.charges.data[0];
    
    // Extraer información de Stripe desde metadata
    const stripeCustomerId = order.metadata?.stripe_customer_id;
    
    if (!stripeCustomerId) {
      console.error('Missing Stripe customer ID in order metadata');
      return;
    }
    
    // Reportar el pago fallido a Stripe usando Payment Records
    await stripe.paymentRecords.reportPayment({
      amount_requested: {
        value: charge.amount || order.amount,
        currency: charge.currency || order.currency || 'mxn'
      },
      customer_details: {
        customer: stripeCustomerId
      },
      payment_method_details: {
        custom: {
          type: 'cpmt_1RlIoSKqUi3Ta8kBZEgWbZAR',
        },
        type: 'custom',
      },
      initiated_at: Math.floor(new Date(charge.created_at).getTime() / 1000),
      customer_presence: 'on_session',
      payment_reference: charge.id,
      outcome: 'failed',
      failed: {
        failed_at: Math.floor(new Date(charge.updated_at || charge.created_at).getTime() / 1000),
        reason: charge.failure_code || 'declined'
      },
      metadata: {
        conekta_order_id: order.id,
        conekta_charge_id: charge.id,
        external_id: `conekta_${charge.id}`,
        payment_processor: 'conekta',
        failure_reason: charge.failure_message || 'Order declined',
        webhook_processed: 'true'
      }
    });
    
    console.log('Successfully processed order.declined event:', order.id);
    
  } catch (error) {
    console.error('Error handling order.declined:', error);
    throw error;
  }
}
