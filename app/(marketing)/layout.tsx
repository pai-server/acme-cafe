import { Header } from '@/components/header';
import { MarketingBanner } from '@/components/marketing-banner';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
      <MarketingBanner />
    </div>
  );
} 