'use client'

import { useQuery } from '@tanstack/react-query'
import { account } from '@/lib/appwrite/config'
import type { Models } from 'appwrite'

export function useCurrentUser() {
  return useQuery<Models.User<Models.Preferences>>({
    queryKey: ['current-user'],
    queryFn: async () => {
      return await account.get()
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  })
}
