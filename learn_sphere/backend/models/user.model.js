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

const badgeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
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
}, { _id: false }); // Disable _id for progress schema

// const userSchema = new mongoose.Schema({
//   username: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   password: {
//     type: String,
//     required: true,
//   },
//   pronouns: {
//     type: String,
//     default: ""
//   },
//   institution: {
//     type: String,
//     default: ""
//   },
//   year: {
//     type: String,
//     default: ""
//   },
//   branch: {
//     type: String,
//     default: ""
//   },
//   badges: {
//     type: [badgeSchema],
//     default: [
//       { title: "Calculus Sensei", icon: "📐" },
//       { title: "Bond Master", icon: "🧪" },
//       { title: "Physics Pro", icon: "⚡" }
//     ]
//   },
//   progress: {
//     type: progressSchema,
//     default: {
//       physics: 0,
//       chemistry: 0,
//       maths: 0
//     }
//   },
//   queries: [querySchema]
// }, { timestamps: true });
//   physics: {
//     type: Number,
//     default: 0,
//   },
//   chemistry: {
//     type: Number,
//     default: 0,
//   },
//   maths: {
//     type: Number,
//     default: 0,
//   },
// });

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
    pronouns: {
      type: String,
      default: "",
    },
    institution: {
      type: String,
      default: "",
    },
    year: {
      type: String,
      default: "",
    },
    branch: {
      type: String,
      default: "",
    },
    badges: {
      type: [badgeSchema],
      default: [
        { title: "Calculus Sensei", icon: "📐" },
        { title: "Bond Master", icon: "🧪" },
        { title: "Physics Pro", icon: "⚡" },
      ],
    },
    progress: {
      type: progressSchema,
      default: {
        physics: 0,
        chemistry: 0,
        maths: 0,
      },
    },
    // prompts: {
    //   type: [promptSchema],
    //   default: [],
    // },
    queries: {
      type: [querySchema],
      default: [],
    },
    webSearches: [{
      query: String,
      results: Object,
      timestamp: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
