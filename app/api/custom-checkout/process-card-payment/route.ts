import { NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      paymentIntentId,
      cardNumber,
      expiryDate,
      cvv,
      cardholderName,
      amount,
      currency
    } = body;
    
    // Validar datos requeridos
    if (!paymentIntentId || !cardNumber || !expiryDate || !cvv || !cardholderName) {
      return NextResponse.json(
        { message: 'Todos los datos de la tarjeta son requeridos' },
        { status: 400 }
      );
    }

    // Obtener el PaymentIntent original
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (!paymentIntent) {
      return NextResponse.json(
        { message: 'PaymentIntent no encontrado' },
        { status: 404 }
      );
    }

    // Simular procesamiento del pago (siempre exitoso)
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos de simulación
    
    // Simular datos del resultado del pago
    const paymentResult = {
      id: `cpm_${Math.random().toString(36).substring(2, 15)}`,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      customerId: paymentIntent.customer || 'guest',
      initiated_at: Math.floor(Date.now() / 1000),
      completed_at: Math.floor(Date.now() / 1000),
      paymentMethodId: `pm_${Math.random().toString(36).substring(2, 15)}`,
    };

    // Crear un método de pago personalizado en Stripe
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'custom',
      custom: {
        type: 'cpmt_1RlIoSKqUi3Ta8kBZEgWbZAR',
      },
      metadata: {
        external_id: paymentResult.paymentMethodId
      }
    });
    
    // Adjuntar el método de pago al customer
    if (paymentIntent.customer) {
      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: paymentIntent.customer
      });
      
      // Obtener la última suscripción incompleta del cliente
      const subscriptions = await stripe.subscriptions.list({
        customer: paymentIntent.customer,
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
      
      // Actualizar el método de pago por defecto de la suscripción
      await stripe.subscriptions.update(subscription.id, {
        default_payment_method: paymentMethod.id
      });
      
      // Adjuntar el pago al invoice
      const invoiceAttached = await stripe.invoices.attachPayment(invoice.id, {
        payment_record_data: {
          amount: paymentResult.amount,
          currency: paymentResult.currency,
          money_movement_type: 'out_of_band',
          paid_at: paymentResult.completed_at,
          payment_method: paymentMethod.id,
          payment_reference: paymentResult.id,
        }
      });
    }

    // Generar ID de transacción simulado
    const transactionId = `sim_${Math.random().toString(36).substring(2, 15)}`;

    return NextResponse.json({
      success: true,
      paymentResult,
      transactionId,
      paymentIntent: paymentIntent,
      message: 'Pago procesado exitosamente'
    });

  } catch (error: any) {
    console.error('Error al procesar el pago personalizado:', error);
    
    return NextResponse.json(
      { message: error.message || 'Error al procesar el pago' },
      { status: 500 }
    );
  }
}
