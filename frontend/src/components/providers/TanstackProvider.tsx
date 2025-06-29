'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function TanstackProvider({ children }: { children: React.ReactNode }) {
  // Create a client
  // Note: It's often recommended to keep the client instance stable across renders.
  // For simplicity here, we create it once per provider instance.
  // For more complex scenarios, consider using useState to store the client.
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default TanstackProvider; 