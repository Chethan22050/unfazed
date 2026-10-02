const Therapist = require("../models/Therapist");
const generateUniqueSlug = require("../utils/generateSlug");

const publicProfileFields = "name slug bio specializations languages services";

const getCurrentTherapist = async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.user.id)
      .select("-password_hash -__v")
      .lean();

    if (!therapist) {
      return res.status(404).json({ message: "Therapist not found" });
    }

    return res.status(200).json({
      message: "Protected route accessed successfully",
      user: req.user,
      therapist
    });
  } catch {
    return res.status(500).json({ message: "Unable to load therapist profile" });
  }
};

const updateTherapistProfile = async (req, res) => {
  try {
    const updates = {};
    const editableFields = ["name", "bio", "specializations", "languages", "services"];

    for (const field of editableFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (req.body.slug !== undefined) {
      updates.slug = await generateUniqueSlug(req.body.slug, req.user.id);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Provide at least one profile field to update" });
    }

    const therapist = await Therapist.findByIdAndUpdate(req.user.id, updates, {
      returnDocument: "after",
      runValidators: true
    }).select("-password_hash -__v");

    if (!therapist) {
      return res.status(404).json({ message: "Therapist not found" });
    }

    return res.status(200).json({
      message: "Therapist profile updated successfully",
      therapist
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Profile link is already in use" });
    }

    return res.status(500).json({ message: "Unable to update therapist profile" });
  }
};

const getPublicTherapist = async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ slug: req.params.slug.toLowerCase() })
      .select(publicProfileFields)
      .lean();

    if (!therapist) {
      return res.status(404).json({ message: "Therapist profile not found" });
    }

    return res.status(200).json({ therapist });
  } catch {
    return res.status(500).json({ message: "Unable to load therapist profile" });
  }
};

module.exports = {
  getCurrentTherapist,
  updateTherapistProfile,
  getPublicTherapist
};