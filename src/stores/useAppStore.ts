import { create } from 'zustand'

interface AppState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (v: boolean) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
}))
