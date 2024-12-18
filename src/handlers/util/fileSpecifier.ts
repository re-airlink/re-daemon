import fs from 'fs/promises';
import path from 'path';

const fileSpecifierPath = path.resolve(__dirname, '../../../storage/fileSpecifier.json');

const fileSpecifier = {
    async getCategory(extension: string): Promise<string | null> {
        try {
            const data = await fs.readFile(fileSpecifierPath, 'utf8');
            const categories: Record<string, string[]> = JSON.parse(data);

            for (const [category, extensions] of Object.entries(categories)) {
                if (Array.isArray(extensions) && extensions.includes(extension)) {
                    return category;
                }
            }

            return null;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Error reading file specifier data: ${error.message}`);
            } else {
                throw new Error('An unknown error occurred while reading file specifier data.');
            }
        }
    }
};

export default fileSpecifier;
