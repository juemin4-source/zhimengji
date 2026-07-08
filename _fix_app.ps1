$path = "G:/AI/Chancellor-OS-Lab/projects/zhimengji/src/App.tsx"
$content = Get-Content $path -Raw

# 1. Add lucide-react import
$content = $content -replace "import { useState, useCallback, useMemo, useEffect, useRef } from 'react';", "import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { User, MapPin, Building2, Settings, Calendar, Package, BookOpen, FileText, Search } from 'lucide-react';"

# 2. Fix back button class
$content = $content -replace 'className="nav-back"', 'className="nav-back-btn"'

# 3. Remove duplicate editor mode buttons block
$content = $content -replace '(?s)\s*\{activeNavTab === .文档. && \(.*?\)\}', ''

# 4. Replace TYPE_ICONS map
$oldBlock = @"
  const TYPE_ICONS: Record<string, string> = {
    '人物': '👤', '地点': '📍', '组织': '🏛', '规则/机制': '⚙️',
    '事件': '📅', '物品': '📦', '术语': '📖', '章节': '📄',
  };
"@
$newBlock = @"
  function renderTypeIcon(type: string, size: number = 14) {
    switch (type) {
      case '人物': return <User size={size} />;
      case '地点': return <MapPin size={size} />;
      case '组织': return <Building2 size={size} />;
      case '规则/机制': return <Settings size={size} />;
      case '事件': return <Calendar size={size} />;
      case '物品': return <Package size={size} />;
      case '术语': return <BookOpen size={size} />;
      case '章节': return <FileText size={size} />;
      default: return <FileText size={size} />;
    }
  }
"@
$content = $content -replace [regex]::Escape($oldBlock), $newBlock

# 5. Replace TYPE_ICONS usage with renderTypeIcon
$content = $content -replace 'TYPE_ICONS\[currentObject\.type\] \|\| .📄.', 'renderTypeIcon(currentObject.type)'

# 6. Replace search emoji
$content = $content -replace '🔍 <kbd', '<Search size={16} /><kbd'

# 7. Replace gear emoji
$content = $content -replace '>⚙️</button>', '><Settings size={16} /></button>'

Set-Content $path $content -Encoding utf8
Write-Output "App.tsx done"
