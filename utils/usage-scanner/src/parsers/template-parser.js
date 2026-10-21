import { parse, NodeTypes, ElementTypes } from '@vue/compiler-dom';

/**
 * Normalize a tag name to PascalCase for consistent import/template matching.
 *
 * Kebab-case is transformed (pre-button → PreButton).
 * Already-Pascal names are returned unchanged (ButtonGroup → ButtonGroup).
 *
 * @param {string} name
 * @returns {string}
 */
export function normalizeTagName(name) {
  if (!name.includes('-')) {
    return name;
  }
  return name
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

/**
 * Count how many times each component tag appears in a Vue template string.
 *
 * Only counts custom component tags (tagType === ElementTypes.COMPONENT).
 * Native HTML/SVG tags like <button> or <div> are not counted because
 * @vue/compiler-dom's parse applies the DOM isNativeTag predicate, assigning
 * them ElementTypes.ELEMENT instead of COMPONENT.
 *
 * Known limitations:
 * - <component :is="Foo"> dynamic components are not counted (tag is "component").
 * - <Lib.Foo> dotted/namespaced usage is not attributed to a parent import.
 * - <Button v-for="i in 10"> counts as 1 (source occurrence), not 10.
 *
 * @param {string} templateContent - Raw template source (the content of a <template> block).
 * @returns {Map<string, number>} Map of normalized tag name → occurrence count.
 */
export function countComponentTags(templateContent) {
  if (!templateContent || !templateContent.trim()) {
    return new Map();
  }

  let ast;
  try {
    ast = parse(templateContent);
  } catch {
    return new Map();
  }

  const counts = new Map();
  walkNode(ast, counts);
  return counts;
}

/**
 * @param {{ type: number, tagType?: number, tag?: string, children?: unknown[] }} node
 * @param {Map<string, number>} counts
 */
function walkNode(node, counts) {
  if (
    node.type === NodeTypes.ELEMENT &&
    node.tagType === ElementTypes.COMPONENT
  ) {
    const key = normalizeTagName(node.tag);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (child && typeof child === 'object' && 'type' in child) {
        walkNode(child, counts);
      }
    }
  }
}
