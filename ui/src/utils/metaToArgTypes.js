function deriveControl(config) {
  if (config.options) return 'select'
  if (config.type === Boolean) return 'boolean'
  if (config.type === Number) return 'number'
  return 'text'
}

export function metaToArgTypes(propsMeta) {
  return Object.fromEntries(
    Object.entries(propsMeta).map(([key, config]) => [
      key,
      {
        description: config.description,
        control: config.control ?? deriveControl(config),
        ...(config.options ? { options: config.options } : {}),
        table: {
          defaultValue: { summary: String(config.default) },
          type: { summary: config.type?.name },
        },
      },
    ])
  )
}
