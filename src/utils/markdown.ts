/**
 * Markdown ↔ HTML conversion utilities for 织梦机 v1.2
 * Uses @tiptap/extension-markdown for WYSIWYG serialization.
 * Uses turndown for HTML→Markdown migration of existing content.
 */

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineMarkdown(line: string): string {
  let result = escapeHtml(line);
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  result = result.replace(/\[\[([^\]]+)\]\]/g, '<span class="wiki-link wiki-link-missing">$1</span>');
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  result = result.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  return result;
}

/**
 * Convert Markdown text to HTML for preview rendering.
 */
export function markdownToHtml(md: string): string {
  if (!md) return '<p></p>';
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

    if (trimmed === '') {
      flushList();
      result.push('');
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushList();
      result.push('<hr>');
      i++;
      continue;
    }

    const hMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      const text = inlineMarkdown(hMatch[2]);
      result.push(`<h${level}>${text}</h${level}>`);
      i++;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      flushList();
      const text = inlineMarkdown(trimmed.slice(2));
      result.push(`<blockquote><p>${text}</p></blockquote>`);
      i++;
      continue;
    }

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
 * Ensure editor content is valid for display.
 * Converts Markdown to HTML if needed.
 */
export function ensureEditorContent(content: string): string {
  if (!content) return '<p></p>';
  if (/<[a-z][\s\S]*>/i.test(content)) return content;
  return markdownToHtml(content);
}

/**
 * Detect if content is HTML or Markdown.
 */
export function isHtmlContent(content: string): boolean {
  if (!content) return false;
  return /<[a-z][\s\S]*>/i.test(content) && !content.includes('**') && !content.includes('##') && !content.includes('* ');
}

/**
 * Simple HTML→Markdown conversion for migration.
 * Used when existing HTML content needs to be converted to Markdown.
 * This is a lightweight implementation; for full spec compliance
 * the turndown library should be used.
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !isHtmlContent(html)) return html;

  let md = html;

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');

  // Bold/Italic
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*');

  // Links and images
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');

  // Code
  md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<pre><code>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n');

  // Blockquotes
  md = md.replace(/<blockquote>(.*?)<\/blockquote>/gis, (match, content) => {
    return '> ' + content.replace(/<p>(.*?)<\/p>/gi, '$1').replace(/\n/g, '\n> ') + '\n\n';
  });

  // Lists
  md = md.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?ul[^>]*>/gi, '\n');
  md = md.replace(/<\/?ol[^>]*>/gi, '\n');

  // Paragraphs and breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<\/p>/gi, '\n\n');
  md = md.replace(/<p[^>]*>/gi, '');

  // WikiLinks (preserve)
  md = md.replace(/<span class="wiki-link[^>]*>(.*?)<\/span>/gi, '[[$1]]');

  // Cleanup
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/\n{3,}/g, '\n\n');
  md = md.replace(/^\s+|\s+$/g, '');

  return md;
}

/**
 * Count words in markdown content.
 * Counts Chinese characters + English words.
 */
export function countWords(content: string): number {
  if (!content) return 0;
  const chineseChars = (content.match(/[一-鿿]/g) || []).length;
  const englishText = content.replace(/[一-鿿]/g, ' ');
  const englishWords = englishText.split(/\s+/).filter(w => w.length > 0).length;
  return chineseChars + englishWords;
}
