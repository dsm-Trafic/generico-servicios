export function optionalText(data: FormData, key: string) {
  return String(data.get(key) ?? '').trim() || null;
}

export function requiredText(data: FormData, key: string) {
  const value = optionalText(data, key);
  if (!value) throw new Error('REQUIRED_FIELD');
  return value;
}
