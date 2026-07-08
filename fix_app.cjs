const fs = require("fs");
const path = "G:/AI/Chancellor-OS-Lab/projects/zhimengji/src/App.tsx";
let content = fs.readFileSync(path, "utf-8");

// Build a replacement map for corrupted strings
// The corruption happened because PowerShell read UTF-8 as GBK,
// then we recovered by re-encoding as GBK and reading as UTF-8.
// Some characters were lost in translation.

// Count replacement chars before fix
const beforeCount = (content.match(/�/g) || []).length;
console.log("Replacement chars before: " + beforeCount);

// Fix each corrupted string
// We need to handle these carefully - the replacement char U+FFFD may be 
// followed by valid chars that give us context about what should be there

// Let me check what the corrupted strings look like by examining patterns
// The fixes below are based on the correct original TypeScript

// Known corrupted words in context:
content = content.replace(/未分�/g, "未分类");
content = content.replace(/未收�/g, "未收录");
content = content.replace(/待验�/g, "待验证");
content = content.replace(/操�/g, "操作");
content = content.replace(/设�/g, "设定");
content = content.replace(/状�/g, "状态");

// Specific corrupted strings from the file
content = content.replace(/作品�\${title}」已创建/g, "作品「${title}」已创建");

// For the backtick template strings in onCreateObject and onCreateNamedObject
// These got doubly corrupted because my Node fix_app.cjs already replaced them
// So let me check what's currently there

// Count after fix
const afterCount = (content.match(/�/g) || []).length;
console.log("Remaining replacement chars: " + afterCount);

// Fix indentation of function declarations
// The onCreateNamedObject might have lost its indentation
content = content.replace(/^const onCreateNamedObject =/m, "  const onCreateNamedObject =");
content = content.replace(/^const onDeleteObject =/m, "  const onDeleteObject =");
content = content.replace(/^const onLockObject =/m, "  const onLockObject =");

fs.writeFileSync(path, content, "utf-8");
console.log("Fixed App.tsx");
