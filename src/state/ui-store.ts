import { create } from 'zustand';

export type CodeViewMode = 'node' | 'pipeline';

interface UiState {
  bottomPanelOpen: boolean;
  codeViewMode: CodeViewMode;
  rightPanelTab: 'inspector' | 'profile' | 'code';
  highlightedColumn: string | null;

  setBottomPanelOpen: (open: boolean) => void;
  setCodeViewMode: (mode: CodeViewMode) => void;
  setRightPanelTab: (tab: 'inspector' | 'profile' | 'code') => void;
  setHighlightedColumn: (column: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  bottomPanelOpen: true,
  codeViewMode: 'pipeline',
  rightPanelTab: 'inspector',
  highlightedColumn: null,

  setBottomPanelOpen(open) {
    set({ bottomPanelOpen: open });
  },

  setCodeViewMode(mode) {
    set({ codeViewMode: mode });
  },

  setRightPanelTab(tab) {
    set({ rightPanelTab: tab });
  },

  setHighlightedColumn(column) {
    set({ highlightedColumn: column });
  },
}));
