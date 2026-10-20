import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import "./globals.css";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Volt On Live Rates",
  description: "Live solar product rates for the Volt On team screen.",
  applicationName: "Volt On Rates",
  // iPhone "Add to Home Screen": opens full screen like an app, with the Volt On icon (src/app/apple-icon.png).
  appleWebApp: { capable: true, title: "Volt On Rates", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0c1a2b",
  viewportFit: "cover", // use the whole iPhone screen; the admin header adds safe-area padding
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
