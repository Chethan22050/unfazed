const bcrypt = require("bcryptjs");
const Therapist = require("../models/Therapist");
const jwt = require("jsonwebtoken");
const generateUniqueSlug = require("../utils/generateSlug");
const SubscriptionTierConfig = require("../models/SubscriptionTierConfig");

// REGISTER
const registerTherapist = async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      slug: requestedSlug,
      bio,
      specializations,
      languages
    } = req.body;

    const normalizedEmail = email.trim().toLowerCase();
    const existingTherapist = await Therapist.findOne({ email: normalizedEmail });

    if (existingTherapist) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const slug = await generateUniqueSlug(requestedSlug || name);
    const defaultTier = await SubscriptionTierConfig.findOne({ isDefault: true, isActive: true }).select("_id").lean();

    const therapist = await Therapist.create({
      email: normalizedEmail,
      password_hash,
      name,
      slug,
      bio,
      specializations,
      languages,
      subscriptionTier: defaultTier?._id || null
    });

    res.status(201).json({
      message: "Therapist registered successfully",
      therapist: {
        id: therapist._id,
        email: therapist.email,
        name: therapist.name,
        slug: therapist.slug
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email or profile link is already in use"
      });
    }

    res.status(500).json({
      message: "Registration failed"
    });
  }
};


// LOGIN
const loginTherapist = async (req, res) => {
  try {
    const { email, password } = req.body;

    const therapist = await Therapist.findOne({ email });

    if (!therapist) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      therapist.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }
    const token = jwt.sign(
    {
        id: therapist._id,
        email: therapist.email
    },
    process.env.JWT_SECRET,
    {
        expiresIn: "1d"
    }
);
    

   return res.status(200).json({
      message: "Login successful",
      token,
      therapist: {
        id: therapist._id,
        email: therapist.email,
        name: therapist.name,
        slug: therapist.slug
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Login failed"
    });
  }
};


// EXPORT
module.exports = {
  registerTherapist,
  loginTherapist
};