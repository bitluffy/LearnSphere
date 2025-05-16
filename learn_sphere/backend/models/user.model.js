import mongoose from 'mongoose';

const promptSchema = new mongoose.Schema({
    query: {
        type: String,
        required: true
    },
    response: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

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
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
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

const User = mongoose.model('User', userSchema);
export default User;
