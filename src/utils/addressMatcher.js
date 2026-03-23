// Match receipt addresses against known store locations to pick the correct physical store address

/** Normalize a string: trim, lowercase, collapse whitespace */
export const normalize = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

/** Strip common Polish street prefixes (ul., al., pl.) for fuzzy matching */
export const stripStreetPrefix = (s) => s.replace(/^ul\.\s*/, "").replace(/^al\.\s*/, "").replace(/^pl\.\s*/, "");

/** Strip legal suffixes like "sp. z o.o.", "s.a.", "s.c.", "sp.j.", numbers, etc. for fuzzy store matching */
export const stripLegalSuffix = (s) =>
  s.replace(/\s*(sp\.?\s*z\s*o\.?\s*o\.?|s\.?\s*a\.?|s\.?\s*c\.?|sp\.?\s*j\.?|sp\.?\s*k\.?|spółka\s+\w+)\s*/gi, "")
   .replace(/\s*\d+\s*$/, "")
   .replace(/\s+/g, " ")
   .trim();

/** Fuzzy-match two store names: normalize + strip legal suffixes, then compare */
export const fuzzyStoreMatch = (a, b) => {
  const na = stripLegalSuffix(normalize(a));
  const nb = stripLegalSuffix(normalize(b));
  if (!na || !nb) return false;
  return na === nb || na.startsWith(nb) || nb.startsWith(na);
};

const zipMatch = (a, b) => a && b && normalize(a) === normalize(b);

const addressMatch = (a, b) => {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return stripStreetPrefix(na) === stripStreetPrefix(nb);
};

/**
 * Given AI-extracted receipt data and known store locations, match the correct
 * physical store address. Receipts often have two addresses: the registered
 * company/HQ address and the actual store location. This function checks all
 * extracted addresses against known locations and picks the matching one.
 *
 * When the store name matches a known store (even with legal suffixes like
 * "sp. z o.o."), the canonical store name from the database is used.
 * If the address is new, the receipt is flagged with _isNewLocation = true.
 *
 * @param {Object} receipt - AI-extracted receipt with address, zip_code, city, all_addresses, store
 * @param {Array} storeLocations - Known store locations [{store, address, zip_code, city, label}]
 * @returns {Object} receipt with corrected address/zip_code/city if a match was found
 */
export function matchStoreAddress(receipt, storeLocations) {
  if (!receipt || !storeLocations || storeLocations.length === 0) return receipt;

  const allAddresses = receipt.all_addresses;

  // Find relevant locations using fuzzy store name matching
  const storeName = normalize(receipt.store);
  const relevantLocations = storeName
    ? storeLocations.filter(loc => fuzzyStoreMatch(loc.store, receipt.store))
    : storeLocations;

  // If we matched a known store chain, use the canonical store name
  let canonicalStore = receipt.store;
  if (relevantLocations.length > 0 && storeName) {
    canonicalStore = relevantLocations[0].store;
  }

  if (!Array.isArray(allAddresses) || allAddresses.length === 0) {
    if (canonicalStore !== receipt.store) {
      return { ...receipt, store: canonicalStore };
    }
    return receipt;
  }

  if (relevantLocations.length === 0) return receipt;

  // Try to find a match between any extracted address and any known location
  for (const addr of allAddresses) {
    for (const loc of relevantLocations) {
      const matched = zipMatch(addr.zip_code, loc.zip_code) || addressMatch(addr.address, loc.address);
      if (matched) {
        // Known store location is the source of truth — prefer its details
        return {
          ...receipt,
          store: canonicalStore,
          address: loc.address || addr.address,
          zip_code: loc.zip_code || addr.zip_code,
          city: loc.city || addr.city,
        };
      }
    }
  }

  // No address match found — this is a new location for a known store
  // If AI already picked a "store" type address, trust it.
  // Otherwise, prefer a "store" typed address over what AI set as default.
  const storeAddr = allAddresses.find(a => a.type === "store");
  const isNewLocation = relevantLocations.length > 0;

  if (storeAddr && (
    storeAddr.address !== receipt.address ||
    storeAddr.zip_code !== receipt.zip_code ||
    storeAddr.city !== receipt.city
  )) {
    return {
      ...receipt,
      store: canonicalStore,
      address: storeAddr.address || receipt.address,
      zip_code: storeAddr.zip_code || receipt.zip_code,
      city: storeAddr.city || receipt.city,
      ...(isNewLocation ? { _isNewLocation: true } : {}),
    };
  }

  return {
    ...receipt,
    store: canonicalStore,
    ...(isNewLocation ? { _isNewLocation: true } : {}),
  };
}
