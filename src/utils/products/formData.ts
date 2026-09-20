const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Blob);

/**
 * Appends `value` using Rails' nested-parameter convention: nested values must become
 * indexed keys (`product[variants_attributes][0][name]`), because strong parameters
 * silently drops a JSON string. `null` becomes `''` and an empty array a single blank
 * element, so clearing a field works on multipart as it does on JSON.
 */
export const appendField = (formData: FormData, key: string, value: unknown): void => {
  if (value === undefined) return;

  if (value === null) {
    formData.append(key, '');
    return;
  }

  if (value instanceof Blob) {
    formData.append(key, value);
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      formData.append(`${key}[]`, '');
      return;
    }
    value.forEach((item, index) => {
      if (isPlainObject(item)) {
        appendField(formData, `${key}[${index}]`, item);
      } else {
        appendField(formData, `${key}[]`, item);
      }
    });
    return;
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([childKey, childValue]) =>
      appendField(formData, `${key}[${childKey}]`, childValue),
    );
    return;
  }

  formData.append(key, String(value));
};
