import fs from 'fs';
import path from 'path';

const PROMPTS_DIR = path.join(process.cwd(), 'data', 'prompts');

// Ensure the prompts directory exists
try {
    if (!fs.existsSync(PROMPTS_DIR)) {
        console.log('Creating prompts directory:', PROMPTS_DIR);
        fs.mkdirSync(PROMPTS_DIR, { recursive: true });
    }
} catch (error) {
    console.error('Error creating prompts directory:', error);
}

export const savePrompt = async (query, solution, subject) => {
    try {
        // Validate inputs
        if (!query || !solution || !subject) {
            throw new Error('Missing required fields: query, solution, or subject');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${subject}_${timestamp}.txt`;
        const filePath = path.join(PROMPTS_DIR, filename);
        
        const content = `Query: ${query}\n\nSolution: ${solution}\n\nSubject: ${subject}\nTimestamp: ${timestamp}`;
        
        console.log('Saving prompt to:', filePath);
        await fs.promises.writeFile(filePath, content, 'utf8');
        
        // Verify the file was written
        const stats = await fs.promises.stat(filePath);
        console.log('File saved successfully. Size:', stats.size, 'bytes');
        
        return { success: true, filePath };
    } catch (error) {
        console.error('Error saving prompt:', error);
        return { success: false, error: error.message };
    }
};

export const getAllPrompts = async () => {
    try {
        console.log('Reading prompts from:', PROMPTS_DIR);
        const files = await fs.promises.readdir(PROMPTS_DIR);
        console.log('Found', files.length, 'prompt files');
        
        const prompts = [];
        for (const file of files) {
            const filePath = path.join(PROMPTS_DIR, file);
            const content = await fs.promises.readFile(filePath, 'utf8');
            prompts.push({
                filename: file,
                content
            });
        }
        
        return prompts;
    } catch (error) {
        console.error('Error reading prompts:', error);
        return [];
    }
}; 