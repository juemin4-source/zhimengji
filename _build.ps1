$path = "G:\AI\Chancellor-OS-Lab\projects\zhimengji\src\components\CanvasView.tsx"
$p1 = @"
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
"@
$p1 | Set-Content -Path $path -Encoding UTF8

$p2 = @"
import type { WorldObject, Connection, CanvasTab, CanvasTabState, CanvasToolMode, StickyNote, CanvasNodePosition, ObjectType, ConnectionType } from '../types/world';
"@
Add-Content -Path $path -Value $p2 -Encoding UTF8
"done"
