import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

export const updateProfile = async (req, res) => {
  try {
    const { username, email, pronouns, institution, year, branch } = req.body;
    const userId = req.user.id;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: "Username already in use" });
      }
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (pronouns) updateData.pronouns = pronouns;
    if (institution) updateData.institution = institution;
    if (year) updateData.year = year;
    if (branch) updateData.branch = branch;

    // Handle profile image upload
    if (req.file) {
      try {
        // Upload new image to Cloudinary
        const result = await uploadToCloudinary(req.file.path);
        
        // Delete old image from Cloudinary if it exists
        const user = await User.findById(userId);
        if (user.profileImage.publicId) {
          await deleteFromCloudinary(user.profileImage.publicId);
        }

        updateData.profileImage = {
          url: result.url,
          publicId: result.publicId
        };
      } catch (error) {
        return res.status(500).json({ error: "Error uploading profile image" });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; 