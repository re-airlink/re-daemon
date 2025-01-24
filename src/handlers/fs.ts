import path from 'path';
import fs from 'fs/promises';
import fetch from 'node-fetch'; // Ensure this is installed via npm
import fileSpecifier from './util/fileSpecifier';

const sanitizePath = (base: string, relativePath: string): string => {
    const fullPath = path.join(base, relativePath);
    if (!fullPath.startsWith(base)) {
        throw new Error('Invalid path: Directory traversal is not allowed.');
    }
    return fullPath;
};

const requestCache = new Map();

const getDirectorySize = async (directory: string): Promise<number> => {
    const contents = await fs.readdir(directory, { withFileTypes: true });
    let totalSize = 0;

    for (const dirent of contents) {
        const fullPath = path.join(directory, dirent.name);
        if (dirent.isDirectory()) {
            totalSize += await getDirectorySize(fullPath);
        } else {
            const stats = await fs.stat(fullPath);
            totalSize += stats.size;
        }
    }

    return totalSize;
};

const getFileSize = async (filePath: string): Promise<number> => {
    const stats = await fs.stat(filePath);
    return stats.size;
};

const getFileContent = async (filePath: string): Promise<string | null> => {
    try {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            return fileContent;
        }
        return null;
    } catch (error) {
        return null;
    }
};

const afs = {
    async list(id: string, relativePath: string = '/', filter?: string) {
        const currentTime = Date.now();

        if (!requestCache.has(id)) {
            requestCache.set(id, { lastRequest: currentTime, count: 0, cache: null });
        }

        const rateData = requestCache.get(id);

        if (rateData.cache && currentTime - rateData.lastRequest < 1000) {
            return rateData.cache;
        }

        if (currentTime - rateData.lastRequest < 1000) {
            rateData.count += 1;
        } else {
            rateData.count = 1;
        }

        rateData.lastRequest = currentTime;

        if (rateData.count > 5) {
            rateData.cache = { error: 'Too many requests, please wait 3 seconds.' };
            setTimeout(() => requestCache.delete(id), 3000);
            return rateData.cache;
        }

        try {
            const baseDirectory = path.resolve(`volumes/${id}`);
            const targetDirectory = sanitizePath(baseDirectory, relativePath);
            const directoryContents = await fs.readdir(targetDirectory, { withFileTypes: true });
            const results = await Promise.all(directoryContents.map(async dirent => {
                const ext = path.extname(dirent.name).substring(1);
                const category = await fileSpecifier.getCategory(ext);
                let size = null;

                if (dirent.isDirectory()) {
                    const dirPath = path.join(targetDirectory, dirent.name);
                    size = await getDirectorySize(dirPath);
                } else {
                    const filePath = path.join(targetDirectory, dirent.name);
                    size = await getFileSize(filePath);
                }

                return {
                    name: dirent.name,
                    type: dirent.isDirectory() ? 'directory' : 'file',
                    extension: dirent.isDirectory() ? null : ext,
                    category: dirent.isDirectory() ? null : category,
                    size: size
                };
            }));

            const limitedResults = results.slice(0, 256);

            if (filter) {
                return limitedResults.filter(item => item.name.includes(filter));
            }

            rateData.cache = limitedResults;
            return limitedResults;
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Error listing directory: ${error.message}`);
            } else {
                throw new Error('An unknown error occurred.');
            }
        }
    },

    async getFileSizeHandler(id: string, relativePath: string = '/'): Promise<number> {
        try {
            const baseDirectory = path.resolve(`volumes/${id}`);
            const filePath = sanitizePath(baseDirectory, relativePath);
            return await getFileSize(filePath);
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Error getting file size: ${error.message}`);
            } else {
                throw new Error('An unknown error occurred.');
            }
        }
    },

    async getDirectorySizeHandler(id: string, relativePath: string = '/'): Promise<number> {
        try {
            const baseDirectory = path.resolve(`volumes/${id}`);
            const dirPath = sanitizePath(baseDirectory, relativePath);
            return await getDirectorySize(dirPath);
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Error getting directory size: ${error.message}`);
            } else {
                throw new Error('An unknown error occurred.');
            }
        }
    },

    async getFileContentHandler(id: string, relativePath: string = '/'): Promise<string | null> {
        try {
            const baseDirectory = path.resolve(`volumes/${id}`);
            const filePath = sanitizePath(baseDirectory, relativePath);
            return await getFileContent(filePath);
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Error getting file content: ${error.message}`);
            } else {
                throw new Error('An unknown error occurred.');
            }
        }
    },

    async writeFileContentHandler(id: string, relativePath: string, content: string): Promise<void> {
        try {
            const baseDirectory = path.resolve(`volumes/${id}`);
            const filePath = sanitizePath(baseDirectory, relativePath);
            await fs.writeFile(filePath, content);
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Error writing file content: ${error.message}`);
            } else {
                throw new Error('An unknown error occurred.');
            }
        }
    },

    async rm(id: string, relativePath: string): Promise<void> {
        try {
            const baseDirectory = path.resolve(`volumes/${id}`);
            const targetPath = sanitizePath(baseDirectory, relativePath);

            const stat = await fs.lstat(targetPath);

            if (stat.isDirectory()) {
                await fs.rm(targetPath, { recursive: true, force: true });
            } else if (stat.isFile()) {
                await fs.unlink(targetPath);
            } else {
                throw new Error('Path is neither a file nor a directory.');
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Error deleting path: ${error.message}`);
            } else {
                throw new Error('An unknown error occurred.');
            }
        }
    },

    async download(id: string, url: string, relativePath: string): Promise<void> {
        try {
            const baseDirectory = path.resolve(`volumes/${id}`);
            const filePath = sanitizePath(baseDirectory, relativePath);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download file from ${url}: ${response.statusText}`);
            }

            const fileContent = await response.buffer();
            const dirPath = path.dirname(filePath);
            
            await fs.mkdir(dirPath, { recursive: true });
            await fs.writeFile(filePath, fileContent);
            console.log(`File downloaded successfully to ${filePath}`);
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Error downloading file: ${error.message}`);
            } else {
                throw new Error('An unknown error occurred during download.');
            }
        }
    }
};

export default afs;
