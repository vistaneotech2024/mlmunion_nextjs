'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WelcomeMessage } from '@/components/WelcomeMessage';
import { ChatContainer } from '@/components/Chat/ChatContainer';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <WelcomeMessage />
      <main className="flex-grow">{children}</main>
      <Footer />
      <ChatContainer />
    </>
  );
}
