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
    prompts: [promptSchema] // <-- Store prompt history here
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
