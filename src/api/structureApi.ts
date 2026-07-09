/**
 * structureApi — 织梦机 v2 StructureNode API layer.
 */
import { invoke } from '@tauri-apps/api/core';
import type { StructureNode, CreateStructureNodeInput, UpdateStructureNodeInput } from '../contracts/structure.contract';

export async function createStructureNode(input: CreateStructureNodeInput): Promise<StructureNode> {
  return invoke('create_structure_node', { input });
}

export async function listStructureNodes(projectId: string): Promise<StructureNode[]> {
  return invoke('list_structure_nodes', { input: { projectId } });
}

export async function getStructureNode(id: string): Promise<StructureNode | null> {
  return invoke('get_structure_node', { input: { id } });
}

export async function updateStructureNode(input: UpdateStructureNodeInput): Promise<StructureNode> {
  return invoke('update_structure_node', { input });
}

export async function deleteStructureNode(id: string): Promise<void> {
  return invoke('delete_structure_node', { input: { id } });
}
