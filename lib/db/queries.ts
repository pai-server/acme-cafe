import { and, eq } from 'drizzle-orm';
import { db } from './drizzle';
import { products, prices } from './schema';
import type { ProductWithPrices, NewProduct, NewPrice } from './schema';

// Funciones que NO requieren autenticación (para componentes cliente)
export async function getProductsPublic(): Promise<ProductWithPrices[]> {
  const result = await db.query.products.findMany({
    where: eq(products.active, true),
    with: {
      prices: {
        where: eq(prices.active, true),
        orderBy: [prices.unitAmount]
      }
    },
    orderBy: [products.name]
  });

  return result;
}

export async function getProductsWithPricesByIntervalPublic(interval: 'month' | 'year'): Promise<ProductWithPrices[]> {
  const result = await db.query.products.findMany({
    where: eq(products.active, true),
    with: {
      prices: {
        where: and(
          eq(prices.active, true),
          eq(prices.interval, interval)
        ),
        orderBy: [prices.unitAmount]
      }
    },
    orderBy: [products.name]
  });

  return result.filter(product => product.prices.length > 0);
}

export async function getProductByStripeIdPublic(stripeProductId: string) {
  const result = await db.query.products.findFirst({
    where: eq(products.stripeProductId, stripeProductId),
    with: {
      prices: {
        where: eq(prices.active, true)
      }
    }
  });

  return result || null;
}

export async function createProduct(productData: NewProduct) {
  const result = await db.insert(products).values(productData).returning();
  return result[0];
}

export async function createPrice(priceData: NewPrice) {
  const result = await db.insert(prices).values(priceData).returning();
  return result[0];
}

export async function getPriceByStripeIdPublic(stripePriceId: string) {
  const result = await db.query.prices.findFirst({
    where: eq(prices.stripePriceId, stripePriceId),
    with: {
      product: true
    }
  });

  return result || null;
}

// Funciones que requieren autenticación (solo para Server Components)
// Se exportan por separado para evitar problemas de importación en el cliente
