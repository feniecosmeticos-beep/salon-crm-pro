import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUserPermissions } from "@/services/permissions.service";
import { getCurrentSalonContext } from "@/services/salon-context";
import { getCurrentSalonSettings } from "@/services/settings.service";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Salon CRM Pro",
  description: "Base do sistema Salon CRM Pro.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [permissions, salonContext, salonSettings] = await Promise.all([
    getCurrentUserPermissions(),
    getCurrentSalonContext(),
    getCurrentSalonSettings(),
  ]);

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell
          permissions={permissions}
          salon={
            salonSettings.settings
              ? {
                  name: salonSettings.settings.name,
                  plan: salonSettings.settings.plan,
                }
              : null
          }
          salonFallback={salonSettings.state === "unconfigured"}
          salonWarning={salonContext.warningMessage}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
