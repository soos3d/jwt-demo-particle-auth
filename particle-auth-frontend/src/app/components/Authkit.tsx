"use client";

// Particle imports
import { sepolia, baseSepolia } from "@particle-network/authkit/chains";
import { AuthCoreContextProvider } from "@particle-network/authkit";
import { useSmartAccount } from "../context/SmartAccountContext";

export const ParticleAuthkit = ({ children }: React.PropsWithChildren) => {
  const { selectedAccount } = useSmartAccount();

  return (
    <AuthCoreContextProvider
      options={{
        // All env variable must be defined at runtime
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
        clientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
        appId: process.env.NEXT_PUBLIC_APP_ID!,

        themeType: "dark",
        wallet: {
          // Set to false to remove the embedded wallet modal
          visible: true,
          themeType: "dark",
        },
        erc4337: {
          name: selectedAccount as "BICONOMY" | "SIMPLE",
          version: selectedAccount === "BICONOMY" ? "2.0.0" : "1.0.0",
        },

        promptSettingConfig: {
          promptPaymentPasswordSettingWhenSign: false,
        },
        chains: [sepolia, baseSepolia],
      }}
    >
      {children}
    </AuthCoreContextProvider>
  );
};
