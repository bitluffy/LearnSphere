import mongoose from "mongoose";
import fs from 'fs';
import path from 'path';

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    enum: ["physics", "chemistry", "mathematics", "maths", "general"],
    required: true
  },
  messages: [{
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  context: {
    type: String,
    default: ""
  },
  tags: [{
    type: String
  }]
}, { timestamps: true });

// Method to save chat to local file
chatSchema.methods.saveToFile = async function() {
  const chatDir = path.join(process.cwd(), 'chat_history');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(chatDir)) {
    fs.mkdirSync(chatDir, { recursive: true });
  }

  const fileName = `${this.userId}_${this.subject}_${new Date().toISOString().split('T')[0]}.txt`;
  const filePath = path.join(chatDir, fileName);

  // Format chat content
  const chatContent = this.messages.map(msg => 
    `[${msg.timestamp.toISOString()}] ${msg.role.toUpperCase()}: ${msg.content}`
  ).join('\n\n');

  // Append to file
  fs.appendFileSync(filePath, chatContent + '\n\n---\n\n');
};

// Pre-save middleware to ensure chat is saved to file
chatSchema.pre('save', async function(next) {
  if (this.isModified('messages')) {
    await this.saveToFile();
  }
  next();
});

const Chat = mongoose.model("Chat", chatSchema);
export default Chat; 