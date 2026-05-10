/**
 * Append KGS for clearly numeric-looking prices (SRS §5.5).
 */
export function formatPriceWithKgs(text: string): string {
  const t = text.trim();
  if (!t) return t;
  if (/\bkgs\b|\bsom\b|\bсом\b/i.test(t)) return t;
  const compact = t.replace(/\s/g, "");
  const numericLike =
    /^[\d.,]+$/.test(compact) ||
    /^[\d.,]+[–\-~]+[\d.,]+$/.test(compact);
  if (numericLike && /\d/.test(t)) {
    return `${t} KGS`;
  }
  return t;
}
