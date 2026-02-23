import { Metadata } from 'next';
import { VerifyEmailContent } from '@/components/pages/VerifyEmailContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Verify your email - MLM Union',
  description:
    'We sent you a confirmation link. Check your email to verify your MLM Union account and sign in.',
  openGraph: {
    title: 'Verify your email - MLM Union',
    description:
      'We sent you a confirmation link. Check your email to verify your MLM Union account and sign in.',
    type: 'website',
    url: `${baseUrl}/verify-email`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'Verify your email - MLM Union',
    description:
      'We sent you a confirmation link. Check your email to verify your MLM Union account and sign in.',
  },
  alternates: { canonical: `${baseUrl}/verify-email` },
  robots: { index: false, follow: true },
};

type Props = {
  searchParams: { email?: string };
};

export default function VerifyEmailPage({ searchParams }: Props) {
  const email = searchParams?.email
    ? decodeURIComponent(searchParams.email)
    : undefined;

  return <VerifyEmailContent email={email} />;
}
