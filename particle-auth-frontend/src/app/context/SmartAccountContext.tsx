"use client";

import { createContext, useContext, useState, useMemo } from 'react';

// Define the shape of the context data
interface SmartAccountContextType {
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
}

// Create the context with a default undefined value
const SmartAccountContext = createContext<SmartAccountContextType | undefined>(
  undefined
);

// Create a provider component
export const SmartAccountProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedAccount, setSelectedAccount] = useState('BICONOMY');

  const value = useMemo(() => ({ selectedAccount, setSelectedAccount }), [selectedAccount]);

  return (
    <SmartAccountContext.Provider value={value}>
      {children}
    </SmartAccountContext.Provider>
  );
};

// Create a custom hook for easy consumption of the context
export const useSmartAccount = () => {
  const context = useContext(SmartAccountContext);
  if (context === undefined) {
    throw new Error('useSmartAccount must be used within a SmartAccountProvider');
  }
  return context;
};
