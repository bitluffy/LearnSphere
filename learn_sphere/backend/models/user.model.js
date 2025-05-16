import mongoose from "mongoose";

// Schema for individual query-solution pairs
const querySchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
  },
  solution: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    enum: ["physics", "chemistry", "mathematics"],
    default: "other",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    // Array to store all queries and solutions in a single document
    queries: [querySchema],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
