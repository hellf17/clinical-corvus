import 'react-vertical-timeline-component/style.min.css';
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { ToastContainer } from "@/components/ui/Toast";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import dynamic from 'next/dynamic';
import { SidebarProvider, SidebarInset } from "@/components/ui/Sidebar";

const AppSidebar = dynamic(() => import('@/components/layout/Sidebar'), { ssr: false });
const DynamicBackground = dynamic(() => import('@/components/layout/DynamicBackground'), { 
  ssr: false,
  loading: () => (
    <div 
      id="background-container-loading" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: -10,
        background: 'linear-gradient(135deg, #003366 0%, #004C99 50%, #008080 100%)'
      }} 
    />
  )
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clinical Corvus | Dr. Corvus",
  description: "",
  keywords: "análise clínica, exames laboratoriais, UTI, assistente médico, IA médica",
  icons: {
    icon: "/Icon.png",
    shortcut: "/Icon.png",
    apple: "/Icon.png",
    other: [
      { rel: 'icon', type: 'image/png', sizes: '32x32', url: '/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', url: '/favicon-16x16.png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="pt-BR" suppressHydrationWarning>
        <body
          className={`${inter.variable} antialiased text-foreground`}
        >
          <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SidebarProvider>
              <div className="flex min-h-screen relative z-10 max-w-screen-xl mx-auto">
                <DynamicBackground />
                <AppSidebar />
                <SidebarInset className="flex-1 flex flex-col w-full">
                  <div className="flex-1 w-full px-4 py-8 flex flex-col">
                    {children}
                  </div>
                  <ToastContainer />
                </SidebarInset>
              </div>
            </SidebarProvider>
          </NextThemesProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
