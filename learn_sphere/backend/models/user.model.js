import mongoose from "mongoose";
import { savePrompt } from "../utils/promptStorage.js";

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
  ragContext: String,
  metrics: {
    contextCount: Number,
    qualityIndicators: {
      hasEquations: Boolean,
      hasBulletPoints: Boolean,
      hasExamples: Boolean
    }
  }
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
    isCorrect: Boolean,
    options: [String],
    explanation: String
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

// Add RAG metrics schema
const ragMetricsSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    query: String,
    subject: String,
    contextCount: Number,
    responseLength: Number,
    qualityIndicators: {
        hasEquations: Boolean,
        hasBulletPoints: Boolean,
        hasExamples: Boolean
    }
}, { _id: false });

// Add chat context schema
const chatContextSchema = new mongoose.Schema({
    query: String,
    response: String,
    subject: String,
    timestamp: {
        type: Date,
        default: Date.now
    },
    ragContext: String
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePhoto: {
      url: String,
      publicId: String,
    },
    pronouns: String,
    institution: String,
    year: String,
    branch: String,
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
        subject: String,
        totalQuizzes: Number,
        averageScore: Number,
        highestScore: Number,
        lastQuizDate: Date,
        progressHistory: [{
          date: Date,
          score: Number,
          quizCount: Number
        }]
      },
      chemistry: {
        subject: String,
        totalQuizzes: Number,
        averageScore: Number,
        highestScore: Number,
        lastQuizDate: Date,
        progressHistory: [{
          date: Date,
          score: Number,
          quizCount: Number
        }]
      },
      mathematics: {
        subject: String,
        totalQuizzes: Number,
        averageScore: Number,
        highestScore: Number,
        lastQuizDate: Date,
        progressHistory: [{
          date: Date,
          score: Number,
          quizCount: Number
        }]
      }
    },
    queries: {
      type: [querySchema],
      default: [],
    },
    ragMetrics: {
      type: [ragMetricsSchema],
      default: []
    },
    chatContext: {
      type: [chatContextSchema],
      default: []
    },
    rating: {
      current: { type: Number, default: 1000 }, // Starting rating
      history: [{
        previousRating: Number,
        newRating: Number,
        change: Number,
        quizId: String,
        subject: String,
        score: Number,
        timestamp: { type: Date, default: Date.now }
      }],
      subjectRatings: {
        physics: { type: Number, default: 1000 },
        chemistry: { type: Number, default: 1000 },
        mathematics: { type: Number, default: 1000 }
      }
    },
    webSearches: [{
      query: String,
      results: {
        tavilyResults: Object,
        elaboratedResponse: String
      },
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

// Add a pre-save middleware to store prompts locally
userSchema.pre('save', async function(next) {
  if (this.isModified('queries')) {
    const newQueries = this.queries.filter(query => !query._id);
    for (const query of newQueries) {
      await savePrompt(query.query, query.solution, query.subject);
    }
  }
  next();
});

// Add index for better query performance
userSchema.index({ 'queries.createdAt': -1 });
userSchema.index({ 'ragMetrics.timestamp': -1 });
userSchema.index({ 'chatContext.timestamp': -1 });

const User = mongoose.model("User", userSchema);
export default User;
