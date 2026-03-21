// Match receipt addresses against known store locations to pick the correct physical store address

const normalize = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

const zipMatch = (a, b) => a && b && normalize(a) === normalize(b);

const addressMatch = (a, b) => {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Strip common Polish prefixes for fuzzy street matching
  const strip = (s) => s.replace(/^ul\.\s*/, "").replace(/^al\.\s*/, "").replace(/^pl\.\s*/, "");
  return strip(na) === strip(nb);
};

/**
 * Given AI-extracted receipt data and known store locations, match the correct
 * physical store address. Receipts often have two addresses: the registered
 * company/HQ address and the actual store location. This function checks all
 * extracted addresses against known locations and picks the matching one.
 *
 * @param {Object} receipt - AI-extracted receipt with address, zip_code, city, all_addresses, store
 * @param {Array} storeLocations - Known store locations [{store, address, zip_code, city, label}]
 * @returns {Object} receipt with corrected address/zip_code/city if a match was found
 */
export function matchStoreAddress(receipt, storeLocations) {
  if (!receipt || !storeLocations || storeLocations.length === 0) return receipt;

  const allAddresses = receipt.all_addresses;
  if (!Array.isArray(allAddresses) || allAddresses.length === 0) return receipt;

  // Filter locations for this store chain (case-insensitive)
  const storeName = normalize(receipt.store);
  const relevantLocations = storeName
    ? storeLocations.filter(loc => normalize(loc.store) === storeName)
    : storeLocations;

  if (relevantLocations.length === 0) return receipt;

  // Try to find a match between any extracted address and any known location
  for (const addr of allAddresses) {
    for (const loc of relevantLocations) {
      const matched = zipMatch(addr.zip_code, loc.zip_code) || addressMatch(addr.address, loc.address);
      if (matched) {
        // Known store location is the source of truth — prefer its details
        return {
          ...receipt,
          address: loc.address || addr.address,
          zip_code: loc.zip_code || addr.zip_code,
          city: loc.city || addr.city,
        };
      }
    }
  }

  // No match found against known locations.
  // If AI already picked a "store" type address, trust it.
  // Otherwise, prefer a "store" typed address over what AI set as default.
  const storeAddr = allAddresses.find(a => a.type === "store");
  if (storeAddr && (
    storeAddr.address !== receipt.address ||
    storeAddr.zip_code !== receipt.zip_code ||
    storeAddr.city !== receipt.city
  )) {
    return {
      ...receipt,
      address: storeAddr.address || receipt.address,
      zip_code: storeAddr.zip_code || receipt.zip_code,
      city: storeAddr.city || receipt.city,
    };
  }

  return receipt;
}
