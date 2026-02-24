import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { LayoutShell } from '@/components/LayoutShell'
import { ScrollToTop } from '@/components/ScrollToTop'
import { ErrorHandler } from '@/components/ErrorHandler'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthCodeHandler } from '@/components/AuthCodeHandler'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'MLM Union - Network Marketing Platform',
    template: '%s | MLM Union'
  },
  description: 'Join the largest network marketing community. Find MLM companies, connect with direct sellers, and grow your business.',
  keywords: ['MLM', 'Network Marketing', 'Direct Selling', 'MLM Companies'],
  authors: [{ name: 'MLM Union' }],
  creator: 'MLM Union',
  publisher: 'MLM Union',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mlmunion.in',
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@mlmunion',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add verification codes if needed
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Script
          id="metamask-error-handler"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Early error handler for MetaMask errors
                var isMetaMaskError = function(message, source, code) {
                  var m = String(message || '').toLowerCase();
                  var s = String(source || '').toLowerCase();
                  return (
                    m.indexOf('failed to connect to metamask') !== -1 ||
                    m.indexOf('metamask') !== -1 ||
                    s.indexOf('nkbihfbeogaeaoehlefnkodbefgpgknn') !== -1 ||
                    s.indexOf('inpage.js') !== -1 ||
                    code === 4001 || // user rejected request
                    code === -32002 // request already pending
                  );
                };

                window.addEventListener('error', function(event) {
                  var errorMessage = event && event.message;
                  var errorSource = event && event.filename;
                  var errorCode = event && event.error && event.error.code;
                  if (
                    isMetaMaskError(errorMessage, errorSource, errorCode)
                  ) {
                    event.preventDefault();
                    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                    if (event.stopPropagation) event.stopPropagation();
                    console.warn('MetaMask error suppressed:', errorMessage);
                  }
                }, true);
                
                window.addEventListener('unhandledrejection', function(event) {
                  var reason = event && event.reason;
                  var errorMessage = (reason && reason.message) ? reason.message : String(reason || '');
                  var errorCode = reason && reason.code;
                  var errorStack = reason && reason.stack;
                  if (isMetaMaskError(errorMessage, errorStack, errorCode)) {
                    event.preventDefault();
                    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                    if (event.stopPropagation) event.stopPropagation();
                    console.warn('MetaMask connection error suppressed:', errorMessage);
                  }
                }, true);
              })();
            `,
          }}
        />
        <ErrorHandler />
        <ErrorBoundary>
          <AuthProvider>
            <SidebarProvider>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <AuthCodeHandler />
                <ScrollToTop />
                <LayoutShell>{children}</LayoutShell>
              </div>
              <Toaster position="top-right" />
            </SidebarProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}

