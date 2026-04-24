/**
 * List price and discount: discount_percent 1–100 applies to the stored list price.
 */
function effectiveUnitPrice(p) {
  const base = parseFloat(String(p.price));
  if (Number.isNaN(base)) return 0;
  const raw = p.discount_percent;
  const d = raw == null || raw === '' ? 0 : parseFloat(String(raw));
  if (Number.isFinite(d) && d > 0 && d <= 100) {
    return Math.round((base * (100 - d)) * 100) / 10000;
  }
  return base;
}

/**
 * Merges discount fields into a plain API product object. Does not copy DB row wholesale.
 * Sets final_price, discount_percent, is_discounted. Keeps `price` as the list (original) price.
 */
function applyDiscountToProductResult(result, sourceRow) {
  const d = sourceRow.discount_percent;
  const dNum = d == null || d === '' ? null : parseFloat(String(d));
  const hasSale = dNum != null && dNum > 0 && dNum <= 100;
  const listStr = result.price;
  const finalP = effectiveUnitPrice({ price: sourceRow.price, discount_percent: sourceRow.discount_percent });
  return {
    ...result,
    discount_percent: dNum,
    final_price: hasSale ? String(finalP) : listStr,
    is_discounted: !!hasSale,
  };
}

module.exports = { effectiveUnitPrice, applyDiscountToProductResult };
