import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Obtener los datos del cuerpo de la petición
    const body = await request.json();
    const { paymentIntentId, name, email } = body;
    
    // Validar que tenemos los datos mínimos necesarios
    if (!paymentIntentId) {
      return NextResponse.json(
        { message: 'paymentIntentId es requerido' },
        { status: 400 }
      );
    }

    // Construir URL de redirección con parámetros necesarios
    const url = new URL(request.url);
    const redirectUrl = new URL('/custom-checkout', url.origin);
    
    // Enviar solo el ID del paymentIntent como parámetro
    redirectUrl.searchParams.set('paymentIntentId', paymentIntentId);
    
    if (name) redirectUrl.searchParams.set('name', name);
    if (email) redirectUrl.searchParams.set('email', email);
    
    // Enviar URL de redirección
    return NextResponse.json({
      success: true,
      redirectUrl: redirectUrl.toString(),
    });
    
  } catch (error: any) {
    console.error('Error al crear la redirección:', error);
    
    return NextResponse.json(
      { message: error.message || 'Error al procesar la solicitud de redirección' },
      { status: 500 }
    );
  }
}
