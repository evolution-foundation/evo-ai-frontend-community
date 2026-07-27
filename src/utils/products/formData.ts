const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Blob);

/**
 * Appends `value` to `formData` using Rails' nested-parameter convention.
 *
 * The product endpoints accept the same payload as JSON or as multipart — the
 * client switches to multipart the moment the user picks an image. Rails parses
 * the two into the same shape ONLY if nested values are expanded into indexed
 * keys (`product[variants_attributes][0][name]`); serialising them as a JSON
 * string instead makes strong parameters drop the whole branch without an
 * error, so variant and metadata edits vanish on any submit that carries a file.
 *
 * - `null` is sent as `''`, which Rails casts back to nil — omitting it would
 *   make "clear this field" a no-op on the multipart path only.
 * - an empty array is sent as a single `''` element, which is how the API is
 *   told "the new list is empty" (e.g. removing the last label).
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
