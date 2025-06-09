import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { checkoutAction } from '@/lib/payments/actions';
import { SubmitButton } from '@/components/ui/submit-button';

interface PricingCardProps {
  name: string;
  price: number;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
}

export function PricingCard({
  name,
  price,
  interval,
  trialDays,
  features,
  priceId
}: PricingCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-4xl font-bold">
          ${price / 100}{' '}
          <span className="text-xl font-normal text-gray-500">
            MXN / {interval}
          </span>
        </p>
        <p className="text-sm text-gray-600">
          con {trialDays} días de prueba gratis
        </p>
        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <form action={checkoutAction}>
          <input type="hidden" name="priceId" value={priceId} />
          <input type="hidden" name="trialPeriodDays" value={trialDays} />
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
} 