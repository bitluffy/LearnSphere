import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        required: true,
        enum: ['pdf', 'doc', 'docx', 'txt', 'image']
    },
    // fileSize: {
    //     type: Number,
    //     required: true
    // },
    uploadedAt: {
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
    physics: [documentSchema],
    maths: [documentSchema],
    chemistry: [documentSchema]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
