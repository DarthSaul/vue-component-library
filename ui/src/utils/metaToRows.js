export function metaToRows(metaObj) {
  return Object.entries(metaObj).map(([name, config]) => ({
    name,
    type: Array.isArray(config.type)
      ? config.type.map((t) => t.name).join(' | ')
      : config.type?.name ?? '—',
    default: config.default !== undefined ? String(config.default) : '—',
    options: config.options ?? [],
    description: config.description ?? '',
  }))
}
