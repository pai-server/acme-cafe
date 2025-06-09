import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users, teams, teamMembers, products, prices } from './schema';
import { hashPassword } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';
import { createProduct, createPrice } from './queries';

async function cleanStripe() {
  console.log('Cleaning up existing Stripe products and prices...');
  const stripeProducts = await stripe.products.list({ limit: 100, active: true });

  for (const product of stripeProducts.data) {
    const stripePrices = await stripe.prices.list({ product: product.id, active: true });
    for (const price of stripePrices.data) {
      await stripe.prices.update(price.id, { active: false });
    }
    await stripe.products.update(product.id, { active: false });
    console.log(`Archived product: ${product.name} (${product.id})`);
  }
  console.log('Stripe cleanup complete.');
}

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...');

  // Crear producto Base
  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Plan perfecto para amantes del café que buscan calidad y variedad en su rutina diaria',
    metadata: {
      features: JSON.stringify([
        '250g de café premium mensual',
        'Selección de granos de origen único', 
        'Notas de cata detalladas',
        'Envío gratuito a domicilio',
        'Acceso a la comunidad cafetera',
        'Soporte por email'
      ])
    }
  });

  // Precio mensual Base
  const basePriceMonthly = await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 16000, // $160 MXN
    currency: 'mxn',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  // Precio anual Base (con descuento del 20%)
  const basePriceYearly = await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 153600, // $1536 MXN ($160 * 12 * 0.8)
    currency: 'mxn',
    recurring: {
      interval: 'year',
      trial_period_days: 7,
    },
  });

  // Crear producto Plus
  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Experiencia cafetera premium con lo mejor de nuestra selección y beneficios exclusivos',
    metadata: {
      features: JSON.stringify([
        'Todo lo del plan Base, y además:',
        '500g de café premium mensual',
        'Mezclas exclusivas de edición limitada',
        'Acceso anticipado a nuevos orígenes',
        'Cata virtual mensual con expertos',
        'Soporte prioritario 24/7',
        'Descuentos en productos adicionales'
      ])
    }
  });

  // Precio mensual Plus
  const plusPriceMonthly = await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 24000, // $240 MXN
    currency: 'mxn',
    recurring: {
      interval: 'month',
      trial_period_days: 14,
    },
  });

  // Precio anual Plus (con descuento del 20%)
  const plusPriceYearly = await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 230400, // $2304 MXN ($240 * 12 * 0.8)
    currency: 'mxn',
    recurring: {
      interval: 'year',
      trial_period_days: 14,
    },
  });

  // Guardar productos en la base de datos local
  const localBaseProduct = await createProduct({
    name: baseProduct.name,
    description: baseProduct.description,
    stripeProductId: baseProduct.id,
    features: baseProduct.metadata.features
  });

  const localPlusProduct = await createProduct({
    name: plusProduct.name,
    description: plusProduct.description,
    stripeProductId: plusProduct.id,
    features: plusProduct.metadata.features
  });

  // Guardar precios en la base de datos local
  await createPrice({
    productId: localBaseProduct.id,
    stripePriceId: basePriceMonthly.id,
    unitAmount: basePriceMonthly.unit_amount!,
    currency: basePriceMonthly.currency,
    interval: basePriceMonthly.recurring!.interval,
    trialPeriodDays: basePriceMonthly.recurring!.trial_period_days || 0
  });

  await createPrice({
    productId: localBaseProduct.id,
    stripePriceId: basePriceYearly.id,
    unitAmount: basePriceYearly.unit_amount!,
    currency: basePriceYearly.currency,
    interval: basePriceYearly.recurring!.interval,
    trialPeriodDays: basePriceYearly.recurring!.trial_period_days || 0
  });

  await createPrice({
    productId: localPlusProduct.id,
    stripePriceId: plusPriceMonthly.id,
    unitAmount: plusPriceMonthly.unit_amount!,
    currency: plusPriceMonthly.currency,
    interval: plusPriceMonthly.recurring!.interval,
    trialPeriodDays: plusPriceMonthly.recurring!.trial_period_days || 0
  });

  await createPrice({
    productId: localPlusProduct.id,
    stripePriceId: plusPriceYearly.id,
    unitAmount: plusPriceYearly.unit_amount!,
    currency: plusPriceYearly.currency,
    interval: plusPriceYearly.recurring!.interval,
    trialPeriodDays: plusPriceYearly.recurring!.trial_period_days || 0
  });

  console.log('Stripe products and prices created successfully.');
  console.log('Local products and prices saved to database.');
}

async function seedDatabase() {
  console.log('Seeding database...');
  const email = 'test@test.com';

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    console.log('Test user already exists. Skipping database seed.');
    return;
  }

  const passwordHash = await hashPassword('admin123');

  const [testUser] = await db
    .insert(users)
    .values([
      {
        email: email,
        passwordHash: passwordHash,
        role: "owner",
      },
    ])
    .returning();

  console.log('Initial user created.');

  const [testTeam] = await db
    .insert(teams)
    .values({
      name: 'Test Team',
    })
    .returning();

  await db.insert(teamMembers).values({
    teamId: testTeam.id,
    userId: testUser.id,
    role: 'owner',
  });

  console.log('Database seeded successfully.');
}

async function main() {
  try {
    await cleanStripe();
    await createStripeProducts();
    await seedDatabase();
  } catch (error) {
    console.error('Seed process failed:', error);
    process.exit(1);
  }
}

main();
