import { NextResponse } from 'next/server';
import { getProductsPublic } from '@/lib/db/queries';

export async function GET() {
  try {
    const products = await getProductsPublic();
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
} 