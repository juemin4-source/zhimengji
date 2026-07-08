/**
 * Lightweight Markdown → HTML converter for preview and editor use.
 * Handles the subset of Markdown used by 织梦机 document content.
 * No external dependencies — inline processing.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineMarkdown(line: string): string {
  // Escape HTML first, then apply markdown transforms
  let result = escapeHtml(line);

  // Images (must be before links)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');

  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Wikilinks [[name]]
  result = result.replace(/\[\[([^\]]+)\]\]/g, '<span class="wiki-link wiki-link-missing">$1</span>');

  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Strikethrough
  result = result.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  // Inline code
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  return result;
}

/**
 * Convert Markdown text to HTML.
 * Handles block-level elements (headings, lists, blockquotes, code blocks, paragraphs).
 */
export function markdownToHtml(md: string): string {
  if (!md) return '<p></p>';

  // If already HTML, return as-is
  if (/<[a-z][\s\S]*>/i.test(md) && !md.includes('**') && !md.includes('##') && !md.includes('* ')) {
    return md;
  }

  const lines = md.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let inList = false;
  let listTag = 'ul';

  function flushList() {
    if (inList) {
      result.push(`</${listTag}>`);
      inList = false;
    }
  }

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Code block (```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        result.push('<pre><code>' + escapeHtml(codeContent.join('\n')) + '</code></pre>');
        codeContent = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
        codeContent = [];
      }
      i++;
      continue;
    }
    if (inCodeBlock) {
      codeContent.push(raw);
      i++;
      continue;
    }

    // Empty line
    if (trimmed === '') {
      flushList();
      result.push(''); // paragraph break
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushList();
      result.push('<hr>');
      i++;
      continue;
    }

    // Headings
    const hMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      const text = inlineMarkdown(hMatch[2]);
      result.push(`<h${level}>${text}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      const text = inlineMarkdown(trimmed.slice(2));
      result.push(`<blockquote><p>${text}</p></blockquote>`);
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(trimmed)) {
      if (!inList) {
        listTag = 'ul';
        result.push('<ul>');
        inList = true;
      }
      const text = inlineMarkdown(trimmed.replace(/^[-*+]\s+/, ''));
      result.push(`<li>${text}</li>`);
      i++;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      if (!inList) {
        listTag = 'ol';
        result.push('<ol>');
        inList = true;
      }
      const text = inlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''));
      result.push(`<li>${text}</li>`);
      i++;
      continue;
    }

    // Paragraph
    flushList();
    const text = inlineMarkdown(trimmed);
    result.push(`<p>${text}</p>`);
    i++;
  }

  flushList();
  if (inCodeBlock) {
    result.push('<pre><code>' + escapeHtml(codeContent.join('\n')) + '</code></pre>');
  }

  return result.join('\n');
}

/**
 * Ensure content is valid HTML for TipTap editor.
 * Converts Markdown to HTML if needed, then wraps in minimal HTML structure.
 */
export function ensureEditorContent(content: string): string {
  if (!content) return '<p></p>';
  if (/<[a-z][\s\S]*>/i.test(content)) return content;
  return markdownToHtml(content);
}
