$path = "G:\AI\Chancellor-OS-Lab\projects\zhimengji\src\components\CanvasView.tsx"

$p1 = @"
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { WorldObject, Connection, CanvasTab, CanvasTabState, CanvasToolMode, StickyNote, CanvasNodePosition, ObjectType, ConnectionType } from '../types/world';
import { STATUS_DISPLAY, CONNECTION_TYPES, CANVAS_TABS } from '../types/world';
import { TEMPLATES } from '../data/seed';

interface TextAnnotation { id: string; text: string; x: number; y: number; }
interface PartitionZone { id: string; label: string; x: number; y: number; width: number; height: number; }

interface ToolDef { mode: CanvasToolMode; icon: string; label: string; shortcut?: string; }

const SIDEBAR_TOOLS: ToolDef[] = [
  { mode: 'select', icon: '↖', label: '选择', shortcut: 'V' },
  { mode: 'drag', icon: '✋', label: '拖动画布', shortcut: 'H' },
  { mode: 'addObject', icon: '▦', label: '对象卡' },
  { mode: 'text', icon: 'T', label: '文本' },
  { mode: 'addSticky', icon: '📝', label: '便签' },
  { mode: 'addConnection', icon: '→', label: '连线' },
  { mode: 'partition', icon: '⊞', label: '分区' },
  { mode: 'template', icon: '▫', label: '模板' },
];
"@
Write-Host "p1 ready"
