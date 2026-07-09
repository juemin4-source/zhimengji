/**
 * chapterPacketApi — 织梦机 v2 ChapterPacket API layer.
 *
 * 封装所有 ChapterPacket Tauri command 调用。
 */
import { invoke } from '@tauri-apps/api/core';
import type {
  ChapterPacket,
  CreateChapterPacketInput,
  UpdateLayersInput,
  ConfirmPacketInput,
  DeletePacketInput,
  // CN-MET-04
  DetailMode,
  PacketDetailLevel,
  PacketDetailResponse,
  SetDetailModeInput,
  AutoGenerateSketchInput,
  SaveRefinedContentInput,
} from '../contracts/chapter-packet.contract';

export async function createChapterPacket(input: CreateChapterPacketInput): Promise<ChapterPacket> {
  return invoke('create_chapter_packet', { input });
}

export async function listChapterPackets(projectId: string): Promise<ChapterPacket[]> {
  return invoke('list_chapter_packets', { input: { projectId } });
}

export async function getChapterPacket(id: string): Promise<ChapterPacket | null> {
  return invoke('get_chapter_packet', { input: { id } });
}

export async function updateChapterPacketLayers(input: UpdateLayersInput): Promise<ChapterPacket> {
  return invoke('update_chapter_packet_layers', { input });
}

export async function confirmChapterPacket(packetId: string): Promise<ChapterPacket> {
  return invoke('confirm_chapter_packet', { input: { packetId } });
}

export async function deleteChapterPacket(id: string): Promise<void> {
  return invoke('delete_chapter_packet', { input: { id } });
}

// ─── CN-MET-04: Detail Mode API ───

export async function setDetailMode(input: SetDetailModeInput): Promise<PacketDetailLevel> {
  return invoke('set_detail_mode', { input });
}

export async function getPacketDetail(projectId: string): Promise<PacketDetailResponse> {
  return invoke('get_packet_detail', { input: { projectId } });
}

export async function autoGenerateSketch(projectId: string): Promise<void> {
  await invoke('auto_generate_sketch', { input: { projectId } });
}

export async function saveRefinedContent(input: SaveRefinedContentInput): Promise<PacketDetailLevel> {
  return invoke('save_refined_content', { input });
}
