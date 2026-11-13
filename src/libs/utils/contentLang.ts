export const CONTENT_LANGS = ["ru", "ko", "uz"] as const;
export type ContentLang = (typeof CONTENT_LANGS)[number];

const LANG_SET = new Set<string>(CONTENT_LANGS);

export function contentLang(value: unknown): ContentLang | null {
  const code = String(value || "").toLowerCase().split("-")[0];
  return LANG_SET.has(code) ? (code as ContentLang) : null;
}

export function translationsFromBody(body: Record<string, unknown>, fields: string[]) {
  const translations: Record<string, Record<string, string | string[]>> = {};
  for (const lang of CONTENT_LANGS) {
    const entry: Record<string, string | string[]> = {};
    for (const field of fields) {
      const raw = body[`${lang}_${field}`];
      if (field === "blogTags") {
        entry[field] = String(raw || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      } else {
        entry[field] = String(raw || "").trim();
      }
    }
    translations[lang] = entry;
  }
  return translations;
}

function filled(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  return String(value || "").trim().length > 0;
}

export function localize<T>(doc: T, lang: unknown, fields: string[]): T {
  const code = contentLang(lang);
  if (!code || !doc) return doc;
  const plain: any = (doc as any).toObject ? (doc as any).toObject() : { ...(doc as any) };
  const pack = plain.translations?.[code];
  if (!pack) return plain;
  for (const field of fields) {
    if (filled(pack[field])) plain[field] = pack[field];
  }
  return plain;
}
