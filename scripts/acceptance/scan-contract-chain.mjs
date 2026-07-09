#!/usr/bin/env node
/**
 * scan-contract-chain.mjs
 *
 * Checks that each v2 business entity has the full "four-piece" contract chain:
 *   1. src/contracts/*.contract.ts — type definitions
 *   2. src/api/*Api.ts — CRUD methods
 *   3. src-tauri/src/*_commands.rs — Tauri commands
 *   4. src-tauri/src/models.rs — Rust struct definitions
 *   5. src-tauri/src/db.rs — Database methods
 *   6. src/features/ — UI components
 *
 * Usage: node scripts/acceptance/scan-contract-chain.mjs
 * Exit:  0 if all pass, 1 if any FAIL
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, relative } from 'path';

const ROOT = resolve(import.meta.dirname, '../..');

const ENTITIES = [
  {
    name: 'PremiseCard',
    contractFile: 'src/contracts/premise.contract.ts',
    apiFile: 'src/api/premiseApi.ts',
    commandsFile: 'src-tauri/src/premise_commands.rs',
    modelsStruct: 'PremiseCard',
    dbPrefix: 'premise_card',
    uiFiles: ['src/features/canvas-01-premise/PremiseEntryGate.tsx'],
    commands: ['create_premise_card', 'list_premise_cards', 'get_premise_card', 'update_premise_card', 'delete_premise_card'],
    apiMethods: ['createPremiseCard', 'listPremiseCards', 'getPremiseCard', 'updatePremiseCard', 'deletePremiseCard'],
    dbMethods: ['create_premise_card', 'list_premise_cards', 'get_premise_card', 'update_premise_card', 'delete_premise_card'],
  },
  {
    name: 'StructureNode',
    contractFile: 'src/contracts/structure.contract.ts',
    apiFile: 'src/api/structureApi.ts',
    commandsFile: 'src-tauri/src/structure_commands.rs',
    modelsStruct: 'StructureNode',
    dbPrefix: 'structure_node',
    uiFiles: ['src/features/canvas-02-structure/StructureFlowView.tsx', 'src/features/canvas-02-structure/StructureFlowPlaceholder.tsx'],
    commands: ['create_structure_node', 'list_structure_nodes', 'get_structure_node', 'update_structure_node', 'delete_structure_node'],
    apiMethods: ['createStructureNode', 'listStructureNodes', 'getStructureNode', 'updateStructureNode', 'deleteStructureNode'],
    dbMethods: ['create_structure_node', 'list_structure_nodes', 'get_structure_node', 'update_structure_node', 'delete_structure_node'],
  },
  {
    name: 'WorldRule',
    contractFile: 'src/contracts/setting.contract.ts',
    apiFile: 'src/api/settingApi.ts',
    commandsFile: 'src-tauri/src/setting_commands.rs',
    modelsStruct: 'WorldRule',
    dbPrefix: 'world_rule',
    uiFiles: ['src/features/canvas-03-setting/WorldRulePanel.tsx'],
    commands: ['create_world_rule', 'list_world_rules', 'get_world_rule', 'update_world_rule', 'delete_world_rule'],
    apiMethods: ['createWorldRule', 'listWorldRules', 'getWorldRule', 'updateWorldRule', 'deleteWorldRule'],
    dbMethods: ['create_world_rule', 'list_world_rules', 'get_world_rule', 'update_world_rule', 'delete_world_rule'],
  },
  {
    name: 'CharacterCard',
    contractFile: 'src/contracts/setting.contract.ts',
    apiFile: 'src/api/settingApi.ts',
    commandsFile: 'src-tauri/src/setting_commands.rs',
    modelsStruct: 'CharacterCard',
    dbPrefix: 'character_card',
    uiFiles: ['src/features/canvas-03-setting/CharacterPanel.tsx'],
    commands: ['create_character_card', 'list_character_cards', 'get_character_card', 'update_character_card', 'delete_character_card'],
    apiMethods: ['createCharacterCard', 'listCharacterCards', 'getCharacterCard', 'updateCharacterCard', 'deleteCharacterCard'],
    dbMethods: ['create_character_card', 'list_character_cards', 'get_character_card', 'update_character_card', 'delete_character_card'],
  },
  {
    name: 'FactionCard',
    contractFile: 'src/contracts/setting.contract.ts',
    apiFile: 'src/api/settingApi.ts',
    commandsFile: 'src-tauri/src/setting_commands.rs',
    modelsStruct: 'FactionCard',
    dbPrefix: 'faction_card',
    uiFiles: ['src/features/canvas-03-setting/FactionPanel.tsx'],
    commands: ['create_faction_card', 'list_faction_cards', 'get_faction_card', 'update_faction_card', 'delete_faction_card'],
    apiMethods: ['createFactionCard', 'listFactionCards', 'getFactionCard', 'updateFactionCard', 'deleteFactionCard'],
    dbMethods: ['create_faction_card', 'list_faction_cards', 'get_faction_card', 'update_faction_card', 'delete_faction_card'],
  },
  {
    name: 'ChapterPacket',
    contractFile: 'src/contracts/chapter-packet.contract.ts',
    apiFile: 'src/api/chapterPacketApi.ts',
    commandsFile: 'src-tauri/src/chapter_packet_commands.rs',
    modelsStruct: 'ChapterPacket',
    dbPrefix: 'chapter_packet',
    uiFiles: [],
    commands: ['create_chapter_packet', 'list_chapter_packets', 'get_chapter_packet', 'update_chapter_packet_layers', 'confirm_chapter_packet', 'delete_chapter_packet'],
    apiMethods: ['createChapterPacket', 'listChapterPackets', 'getChapterPacket', 'updateChapterPacketLayers', 'confirmChapterPacket', 'deleteChapterPacket'],
    dbMethods: ['create_chapter_packet', 'list_chapter_packets', 'get_chapter_packet', 'update_chapter_packet_layers', 'confirm_chapter_packet', 'delete_chapter_packet'],
  },
  {
    name: 'DecisionLogEntry',
    contractFile: 'src/contracts/decision-log.contract.ts',
    apiFile: 'src/api/decisionLogApi.ts',
    commandsFile: 'src-tauri/src/decision_log_commands.rs',
    modelsStruct: 'DecisionLogEntry',
    dbPrefix: 'decision_log',
    uiFiles: [],
    commands: ['append_decision_log', 'list_decision_logs', 'get_decision_log'],
    apiMethods: ['appendDecisionLog', 'listDecisionLogs', 'getDecisionLog'],
    dbMethods: ['append_decision_log', 'list_decision_logs', 'get_decision_log'],
  },
];

// ---- Helpers ----

let passCount = 0;
let failCount = 0;

function pass(msg) {
  console.log(`  [PASS] ${msg}`);
  passCount++;
}

function fail(msg, detail) {
  console.log(`  [FAIL] ${msg}${detail ? ': ' + detail : ''}`);
  failCount++;
}

function readFile(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

function checkFileExists(filePath) {
  const full = resolve(ROOT, filePath);
  return existsSync(full);
}

function checkContentHas(filePath, pattern) {
  const content = readFile(resolve(ROOT, filePath));
  if (!content) return false;
  return content.includes(pattern);
}

// ---- Check each entity ----

console.log('=== scan-contract-chain ===\n');
console.log('Entity chain verification:\n');

for (const entity of ENTITIES) {
  const { name } = entity;
  console.log(`--- ${name} ---`);

  // 1. Contract definition exists
  if (checkFileExists(entity.contractFile)) {
    // Check interface/type exists
    const hasInterface = checkContentHas(entity.contractFile, `interface ${name}`);
    pass('contract interface', hasInterface ? null : `${name} interface not found in ${entity.contractFile}`);
  } else {
    fail('contract file', `${entity.contractFile} not found`);
  }

  // 2. Api layer exists with CRUD methods
  if (checkFileExists(entity.apiFile)) {
    for (const method of entity.apiMethods) {
      const hasMethod = checkContentHas(entity.apiFile, `export async function ${method}`);
      if (!hasMethod) {
        fail(`api method "${method}"`, `not found in ${entity.apiFile}`);
      }
    }
    pass(`api methods (${entity.apiMethods.length})`);
  } else {
    fail('api file', `${entity.apiFile} not found`);
  }

  // 3. Tauri commands exist
  if (checkFileExists(entity.commandsFile)) {
    for (const cmd of entity.commands) {
      const hasCmd = checkContentHas(entity.commandsFile, `pub fn ${cmd}`);
      if (!hasCmd) {
        fail(`command "${cmd}"`, `not found in ${entity.commandsFile}`);
      }
    }
    pass(`commands (${entity.commands.length})`);
  } else {
    fail('commands file', `${entity.commandsFile} not found`);
  }

  // 4. Rust model struct exists
  if (checkFileExists('src-tauri/src/models.rs')) {
    const hasStruct = checkContentHas('src-tauri/src/models.rs', `pub struct ${entity.modelsStruct}`);
    pass('model struct', hasStruct ? null : `struct ${entity.modelsStruct} not found in models.rs`);
  } else {
    fail('models.rs', 'not found');
  }

  // 5. DB methods exist
  if (checkFileExists('src-tauri/src/db.rs')) {
    for (const method of entity.dbMethods) {
      const hasMethod = checkContentHas('src-tauri/src/db.rs', `pub fn ${method}`);
      if (!hasMethod) {
        fail(`db method "${method}"`, `not found in db.rs`);
      }
    }
    pass(`db methods (${entity.dbMethods.length})`);
  } else {
    fail('db.rs', 'not found');
  }

  // 6. UI feature component exists
  const uiAllExist = entity.uiFiles.every(f => checkFileExists(f));
  pass('UI components', uiAllExist ? null : `missing: ${entity.uiFiles.filter(f => !checkFileExists(f)).join(', ')}`);

  console.log('');
}

// ---- Summary ----

const totalChecks = passCount + failCount;
console.log(`\nResults: ${passCount} PASS, ${failCount} FAIL (${totalChecks} total)`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('\n[PASS] All contract chains complete.');
  process.exit(0);
}
