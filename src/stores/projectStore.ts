import { create } from 'zustand';
import type { PipelineState, CanvasStage, CanvasStatus } from '../contracts/project.contract';

interface ProjectState {
  // UI 运行时状态（不 persist）
  currentProjectId: string | null;
  currentStage: CanvasStage | null;
  canvasStages: { stage: CanvasStage; status: CanvasStatus }[];
  loading: boolean;
  error: string | null;

  // Actions
  setProjectId: (id: string) => void;
  setPipelineState: (state: PipelineState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProjectId: null,
  currentStage: null,
  canvasStages: [],
  loading: false,
  error: null,

  setProjectId: (id) => set({ currentProjectId: id }),
  setPipelineState: (state) => set({
    currentStage: state.currentStage as CanvasStage,
    canvasStages: state.canvasStages.map(cs => ({
      stage: cs.stage as CanvasStage,
      status: cs.status as CanvasStatus,
    })),
  }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({
    currentProjectId: null,
    currentStage: null,
    canvasStages: [],
    loading: false,
    error: null,
  }),
}));
