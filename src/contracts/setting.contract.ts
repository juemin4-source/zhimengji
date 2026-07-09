export interface WorldRule {
  id: string;
  projectId: string;
  title: string;
  ruleText: string;
  cost: string;
  enforcer: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateWorldRuleInput {
  projectId: string;
  title: string;
  ruleText: string;
  cost: string;
  enforcer: string;
}

export interface UpdateWorldRuleInput {
  id: string;
  title: string;
  ruleText: string;
  cost: string;
  enforcer: string;
}

export interface CharacterCard {
  id: string;
  projectId: string;
  name: string;
  hook: string;
  currentWant: string;
  realBlock: string;
  archetype: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateCharacterCardInput {
  projectId: string;
  name: string;
  hook: string;
  currentWant: string;
  realBlock: string;
  archetype: string;
  description: string;
}

export interface UpdateCharacterCardInput {
  id: string;
  name: string;
  hook: string;
  currentWant: string;
  realBlock: string;
  archetype: string;
  description: string;
}

export interface FactionCard {
  id: string;
  projectId: string;
  name: string;
  trueGoal: string;
  publicSlogan: string;
  resources: string[];
  representativeCharacterIds: string[];
  dailyInterface: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateFactionCardInput {
  projectId: string;
  name: string;
  trueGoal: string;
  publicSlogan: string;
  resources: string[];
  representativeCharacterIds: string[];
  dailyInterface: string;
}

export interface UpdateFactionCardInput {
  id: string;
  name: string;
  trueGoal: string;
  publicSlogan: string;
  resources: string[];
  representativeCharacterIds: string[];
  dailyInterface: string;
}
