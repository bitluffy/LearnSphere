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
    enum: ["physics", "chemistry", "mathematics", "maths"],
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

// Schema for quiz results
const quizResultSchema = new mongoose.Schema({
  quizId: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    enum: ["physics", "chemistry", "mathematics", "maths"],
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  questions: [{
    questionId: String,
    questionText: String,
    userAnswer: String,
    correctAnswer: String,
    isCorrect: Boolean
  }],
  feedback: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Schema for subject progress tracking
const subjectProgressSchema = new mongoose.Schema({
  subject: {
    type: String,
    enum: ["physics", "chemistry", "mathematics", "maths"],
    required: true
  },
  totalQuizzes: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  highestScore: {
    type: Number,
    default: 0
  },
  lastQuizDate: {
    type: Date,
    default: Date.now
  },
  progressHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    score: Number,
    quizCount: Number
  }]
}, { _id: false });

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
    profilePhoto: {
      url: String,
      publicId: String
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
    quizResults: {
      type: [quizResultSchema],
      default: []
    },
    subjectProgress: {
      physics: {
        type: subjectProgressSchema,
        default: () => ({
          subject: "physics",
          totalQuizzes: 0,
          averageScore: 0,
          highestScore: 0,
          lastQuizDate: new Date(),
          progressHistory: []
        })
      },
      chemistry: {
        type: subjectProgressSchema,
        default: () => ({
          subject: "chemistry",
          totalQuizzes: 0,
          averageScore: 0,
          highestScore: 0,
          lastQuizDate: new Date(),
          progressHistory: []
        })
      },
      mathematics: {
        type: subjectProgressSchema,
        default: () => ({
          subject: "mathematics",
          totalQuizzes: 0,
          averageScore: 0,
          highestScore: 0,
          lastQuizDate: new Date(),
          progressHistory: []
        })
      }
    },
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

// Add a pre-save middleware to ensure subjectProgress is properly initialized
userSchema.pre('save', function(next) {
  const subjects = ['physics', 'chemistry', 'mathematics'];
  
  subjects.forEach(subject => {
    if (!this.subjectProgress[subject]) {
      this.subjectProgress[subject] = {
        subject: subject,
        totalQuizzes: 0,
        averageScore: 0,
        highestScore: 0,
        lastQuizDate: new Date(),
        progressHistory: []
      };
    }
  });
  
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
