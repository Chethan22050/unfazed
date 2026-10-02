const Therapist = require("../models/Therapist");

const normalizeSlug = (value) => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const generateUniqueSlug = async (value, excludeId) => {
  const baseSlug = normalizeSlug(value) || "therapist";
  let candidate = baseSlug;
  let suffix = 2;
  const query = excludeId ? { _id: { $ne: excludeId } } : {};

  while (await Therapist.exists({ ...query, slug: candidate })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

module.exports = generateUniqueSlug;