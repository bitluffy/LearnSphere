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

<<<<<<< HEAD
const badgeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    }
});

const progressSchema = new mongoose.Schema({
    physics: {
        type: Number,
        default: 0
    },
    chemistry: {
        type: Number,
        default: 0
    },
    maths: {
        type: Number,
        default: 0
    }
});

const userSchema = new mongoose.Schema({
=======
const userSchema = new mongoose.Schema(
  {
>>>>>>> 3a04c22ee9b462eb1cd10e9cc2b0dafbee37c5d0
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
<<<<<<< HEAD
    pronouns: {
        type: String,
        default: ""
    },
    institution: {
        type: String,
        default: ""
    },
    year: {
        type: String,
        default: ""
    },
    branch: {
        type: String,
        default: ""
    },
    badges: {
        type: [badgeSchema],
        default: [
            { title: "Calculus Sensei", icon: "📐" },
            { title: "Bond Master", icon: "🧪" },
            { title: "Physics Pro", icon: "⚡" }
        ]
    },
    progress: {
        type: progressSchema,
        default: {
            physics: 0,
            chemistry: 0,
            maths: 0
        }
    },
    prompts: [promptSchema]
}, { timestamps: true });
=======
    // Array to store all queries and solutions in a single document
    queries: [querySchema],
  },
  { timestamps: true }
);
>>>>>>> 3a04c22ee9b462eb1cd10e9cc2b0dafbee37c5d0

const User = mongoose.model("User", userSchema);
export default User;
