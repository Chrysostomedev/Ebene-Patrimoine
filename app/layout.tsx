import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Poppins } from "next/font/google"; // <-- importer Poppins
import "./globals.css";
import { ThemeProvider } from "../contexts/ThemeContext";
import { SidebarProvider } from "./components/Sidebar";
import { LanguageProvider } from "../contexts/LanguageContext";
import { FormatProvider } from "../contexts/FormatContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Poppins selon Figma
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100","200","300","400","500","600","700","800","900"],
  variable: "--font-primary",
});

export const metadata: Metadata = {
  title: "Facility Management",
  description: "l'application tout en un faite par Canal+ et ses partenaires !",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" translate="no">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`}
      >
        <ThemeProvider>
          <LanguageProvider>
            <FormatProvider>
              <SidebarProvider>
                {children}
              </SidebarProvider>
            </FormatProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

