'use client'

import { ReactNode, useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/shared/Toast'
import { client } from '@/lib/appwrite/config'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  useEffect(() => {
    // Ping o Appwrite ao abrir a aplicação para validar a configuração do SDK
    client.ping()
      .then(res => console.log('✅ Appwrite ping bem-sucedido:', res))
      .catch(err => console.error('❌ Appwrite ping falhou:', err))
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  )
}
