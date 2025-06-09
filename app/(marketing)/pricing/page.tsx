'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BillingToggle } from '@/components/ui/billing-toggle';
import { checkoutAction } from '@/lib/payments/actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { 
  Star, 
  Check, 
  ArrowRight, 
  Shield, 
  Clock, 
  Users, 
  Coffee,
  Package,
  Truck,
  X,
  Zap,
  Heart,
  Award
} from 'lucide-react';
import Link from 'next/link';
import { PricingCardSkeleton } from '@/components/ui/pricing-card-skeleton';
import type { ProductWithPrices } from '@/lib/db/schema';

const testimonials = [
  {
    name: "Laura Martínez",
    role: "CEO, Tech Startup",
    content: "El plan Plus es perfecto para nuestra oficina. La calidad es excepcional y el equipo ama la variedad.",
    rating: 5,
    avatar: "LM",
    plan: "Plus"
  },
  {
    name: "Roberto Silva",
    role: "Freelance Designer", 
    content: "El plan Base me da exactamente lo que necesito. Café increíble sin comprometerme a cantidades enormes.",
    rating: 5,
    avatar: "RS",
    plan: "Base"
  },
  {
    name: "Carmen López",
    role: "Marketing Manager",
    content: "Probé el período gratuito y me enamoré. Ahora no puedo imaginar mi rutina matutina sin Acme Cafes.",
    rating: 5,
    avatar: "CL",
    plan: "Plus"
  }
];

const comparisonFeatures = [
  {
    category: "Producto",
    features: [
      { name: "Cantidad mensual", base: "250g", plus: "500g" },
      { name: "Tipos de café", base: "Origen único", plus: "Origen único + Mezclas exclusivas" },
      { name: "Frecuencia de tostado", base: "Semanal", plus: "Bi-semanal" },
      { name: "Puntuación SCA", base: "85+ puntos", plus: "87+ puntos" }
    ]
  },
  {
    category: "Servicio",
    features: [
      { name: "Envío", base: "Gratis estándar", plus: "Gratis prioritario" },
      { name: "Soporte", base: "Email", plus: "Chat prioritario" },
      { name: "Garantía", base: "30 días", plus: "30 días" },
      { name: "Cancelación", base: "Cualquier momento", plus: "Cualquier momento" }
    ]
  },
  {
    category: "Extras",
    features: [
      { name: "Guías de preparación", base: "Básicas", plus: "Detalladas + Catación" },
      { name: "Eventos virtuales", base: "❌", plus: "✅ Acceso completo" },
      { name: "Descuentos adicionales", base: "❌", plus: "✅ 15% off" },
      { name: "Muestras especiales", base: "❌", plus: "✅ Mensual" }
    ]
  }
];

const faqs = [
  {
    question: "¿Realmente es gratis el período de prueba?",
    answer: "Sí, completamente gratis. Recibes tu primer envío sin costo y puedes cancelar antes de que termine el período de prueba sin ningún cargo."
  },
  {
    question: "¿Puedo cambiar de plan después de suscribirme?",
    answer: "Absolutamente. Puedes cambiar entre planes en cualquier momento desde tu cuenta. Los cambios se aplican en tu próximo ciclo de facturación."
  },
  {
    question: "¿Qué pasa si no me gusta el café que recibo?",
    answer: "Ofrecemos garantía de satisfacción del 100%. Si no estás completamente satisfecho, contáctanos y te enviamos un reemplazo gratis o te devolvemos tu dinero."
  },
  {
    question: "¿Puedo pausar mi suscripción si viajo?",
    answer: "Sí, puedes pausar tu suscripción hasta por 3 meses sin penalizaciones. Perfecto para vacaciones o viajes de trabajo."
  },
  {
    question: "¿Ofrecen descuentos para empresas?",
    answer: "Sí, tenemos planes especiales para equipos de 5+ personas con descuentos progresivos. Contáctanos para una cotización personalizada."
  },
  {
    question: "¿Cómo funciona la cancelación?",
    answer: "Super simple. Un clic en tu cuenta y listo. No hay penalizaciones, contratos a largo plazo ni preguntas incómodas."
  }
];

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [products, setProducts] = useState<ProductWithPrices[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        } else {
          console.error('Failed to fetch products');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);
  
  // Filtrar productos por intervalo de facturación
  const currentProducts = products.map(product => ({
    ...product,
    prices: product.prices.filter(price => price.interval === billingInterval)
  })).filter(product => product.prices.length > 0);

  // Ordenar por precio
  const sortedProducts = currentProducts.sort((a, b) => {
    const priceA = a.prices[0]?.unitAmount || 0;
    const priceB = b.prices[0]?.unitAmount || 0;
    return priceA - priceB;
  });



  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center">
            {/* Social Proof Badge */}
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-orange-200 mb-8">
              <div className="flex -space-x-1">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-orange-500 border-2 border-white"></div>
                ))}
              </div>
              <span className="text-sm font-medium text-gray-700">
                2,500+ empresarios satisfechos
              </span>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl mb-6">
              Planes que se adaptan a{' '}
              <span className="text-orange-600">tu ritmo de vida</span>
            </h1>
            
            <p className="max-w-3xl mx-auto text-xl text-gray-600 leading-8 mb-8">
              Desde el freelancer que necesita su dosis diaria hasta equipos completos. 
              <strong>Comienza gratis, cancela cuando quieras.</strong>
            </p>

            {/* Trust Signals */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500 mb-12">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Garantía 30 días</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Período de prueba gratis</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" />
                <span>Sin compromiso</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Billing Toggle */}
          <BillingToggle 
            interval={billingInterval} 
            onIntervalChange={setBillingInterval} 
          />

          {/* Limited Time Offer Banner */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl p-6 mb-12 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-5 h-5" />
              <span className="font-semibold">Oferta por Tiempo Limitado</span>
            </div>
            <p className="text-lg">
              <strong>Primer mes GRATIS</strong> en cualquier plan + envío gratis por 3 meses
            </p>
            <p className="text-sm opacity-90 mt-1">
              Válido hasta fin de mes • Solo para nuevos usuarios
            </p>
          </div>

          {loading ? (
            <PricingCardSkeleton />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {sortedProducts.map((product, index) => {
              const price = product.prices[0];
              const isPopular = index === 1;
              let features: string[] = [];
              
              try {
                features = product.features ? JSON.parse(product.features) : [];
              } catch (e) {
                features = product.features ? product.features.split(';') : [];
              }

              return (
                <div key={product.id} className="relative">
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-2 text-sm font-semibold">
                        🔥 Más Popular
                      </Badge>
                    </div>
                  )}
                  
                  <div className={`relative rounded-2xl border-2 p-8 bg-white transition-all duration-200 ${
                    isPopular 
                      ? 'border-orange-600 shadow-2xl scale-105' 
                      : 'border-gray-200 hover:border-orange-300 hover:shadow-lg'
                  }`}>
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {product.name}
                      </h3>
                      <div className="mb-4">
                        <span className="text-5xl font-bold text-gray-900">
                          ${Math.floor(price.unitAmount / 100)}
                        </span>
                        <span className="text-xl text-gray-500 ml-2">
                          MXN/{billingInterval === 'month' ? 'mes' : 'año'}
                        </span>
                        {billingInterval === 'year' && (
                          <div className="text-sm text-green-600 font-medium mt-1">
                            Ahorras ${Math.floor((price.unitAmount * 12 * 0.25) / 100)} MXN/año
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-green-500" />
                        <span className="text-green-700 font-medium">
                          {price.trialPeriodDays} días gratis
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <form action={checkoutAction} className="w-full">
                      <input type="hidden" name="priceId" value={price.stripePriceId} />
                      <input type="hidden" name="trialPeriodDays" value={price.trialPeriodDays || 0} />
                      <Button 
                        type="submit"
                        className={`w-full h-12 text-lg font-semibold rounded-lg transition-all duration-200 ${
                          isPopular
                            ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg'
                            : 'bg-gray-900 hover:bg-gray-800 text-white'
                        }`}
                      >
                        Comenzar Prueba Gratuita
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </form>
                    
                    <p className="text-center text-sm text-gray-500 mt-3">
                      Sin tarjeta de crédito • Cancela cuando quieras
                    </p>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
              Lo que dicen nuestros clientes
            </h2>
            <p className="text-xl text-gray-600">
              Historias reales de personas que transformaron su rutina cafetera
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Badge variant="secondary" className="text-xs">
                    Plan {testimonial.plan}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
              Comparación detallada de planes
            </h2>
            <p className="text-xl text-gray-600">
              Todo lo que incluye cada suscripción, sin sorpresas
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {comparisonFeatures.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">{category.category}</h3>
                </div>
                {category.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-gray-100 last:border-b-0">
                    <div className="text-gray-900 font-medium">
                      {feature.name}
                    </div>
                    <div className="text-center text-gray-600">
                      {feature.base}
                    </div>
                    <div className="text-center text-gray-600">
                      {feature.plus}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
              Preguntas Frecuentes
            </h2>
            <p className="text-xl text-gray-600">
              Respuestas claras a las dudas más comunes
            </p>
          </div>

          <div className="space-y-8">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl p-8 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {faq.question}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-600 to-orange-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Coffee className="w-16 h-16 text-white mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
            ¿Listo para transformar tu experiencia cafetera?
          </h2>
          <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
            Únete a miles de personas que ya disfrutan del mejor café cada día. 
            Sin compromisos, sin sorpresas, solo café excepcional.
          </p>
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('.grid')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center justify-center h-14 px-8 text-lg font-semibold text-orange-600 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-all duration-200 group"
          >
            Comenzar mi Prueba Gratuita
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </main>
  );
} 