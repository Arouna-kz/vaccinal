// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import ClientWrapper from '@/components/ClientWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Registre Vaccinal Blockchain',
  description: 'Système de gestion des vaccins décentralisé sur blockchain',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-background text-textPrimary antialiased`}>
        <ClientWrapper>
          {children}
        </ClientWrapper>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#07393a',
              border: '1px solid #00796b',
            },
            success: {
              iconTheme: {
                primary: '#00796b',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#d32f2f',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}