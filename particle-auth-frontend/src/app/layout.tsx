import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { GoogleOAuthProvider } from "@react-oauth/google";

const inter = Inter({ subsets: ["latin"] });

import { ParticleAuthkit } from "@/app/components/Authkit";
import { SmartAccountProvider } from "./context/SmartAccountContext";

export const metadata: Metadata = {
  title: "Particle Auth App",
  description: "An application leveraging Particle Auth for social logins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GoogleOAuthProvider
          clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
        >
          <SmartAccountProvider>
            <ParticleAuthkit>{children}</ParticleAuthkit>
          </SmartAccountProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
