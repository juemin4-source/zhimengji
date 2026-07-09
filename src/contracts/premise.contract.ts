export interface PremiseCard {
  id: string;
  projectId: string;
  premiseText: string;
  readerQuestions: string[];
  storyType: 'high_concept' | 'deep_drill' | 'character_driven' | 'world_driven' | '';
  status: 'draft' | 'confirmed';
  createdAt: number;
  updatedAt: number;
}

export interface CreatePremiseInput {
  projectId: string;
  premiseText: string;
  readerQuestions: string[];
  storyType: PremiseCard['storyType'];
  status: PremiseCard['status'];
}

export interface UpdatePremiseInput {
  id: string;
  premiseText: string;
  readerQuestions: string[];
  storyType: PremiseCard['storyType'];
  status: PremiseCard['status'];
}

export interface ConfirmPremiseInput {
  projectId: string;
}
