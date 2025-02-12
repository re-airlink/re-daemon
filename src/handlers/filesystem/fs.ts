import path from 'path';
import fs from 'fs/promises';
import fsN from 'fs';
import axios from 'axios';
import fileSpecifier from '../../utils/fileSpecifier';
import archiver from 'archiver';

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
            requestCache.set(id, { lastRequest: currentTime, count: 0, cache: null, path: relativePath });
        }
    
        const rateData = requestCache.get(id);
    
        if (rateData.cache && currentTime - rateData.lastRequest < 1000 && rateData.path === relativePath) {
            console.log('Cache hit', relativePath);
            return rateData.cache;
        }
    
        if (currentTime - rateData.lastRequest < 1000) {
            rateData.count += 1;
        } else {
            rateData.count = 1;
        }
    
        rateData.lastRequest = currentTime;
        rateData.path = relativePath;
    
        if (rateData.count > 5) {
            rateData.cache = { error: 'Too many requests, please wait 3 seconds.' };
            console.log('Too many requests, please wait 3 seconds.');
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

    async getFilePath(id: string, relativePath: string = '/') {
        const baseDirectory = path.resolve(`volumes/${id}`);
        return sanitizePath(baseDirectory, relativePath);
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

            if (relativePath === '/') {
                throw new Error('Root directory cannot be deleted.');
            }

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

    async download(id: string, url: string, relativePath: string, environmentVariables?: Record<string, string>): Promise<void> {
        try {
            const baseDirectory = path.resolve(`volumes/${id}`);
            const filePath = sanitizePath(baseDirectory, relativePath);
    
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer'
            });
    
            if (response.status !== 200) {
                throw new Error(`Failed to download file from ${url}: ${response.statusText}`);
            }
    
            let fileContent = response.data;
    
            if (environmentVariables) {
                const regex = /\$ALVKT\((\w+)\)/g;
                fileContent = fileContent.toString().replace(regex, (_: string, variableName: string) => {
                    if (environmentVariables[variableName]) {
                        console.log(environmentVariables[variableName])
                        return environmentVariables[variableName];
                    } else {
                        console.warn(`Variable "${variableName}" not found in environment variables.`);
                        return '';
                    }
                });

                console.log(fileContent)
            }
            const dirPath = path.dirname(filePath);
            await fs.mkdir(dirPath, { recursive: true });
            await fs.writeFile(filePath, fileContent);
            console.log(`File downloaded successfully to ${filePath}`);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Error downloading file: ${error.message}`);
            } else if (error instanceof Error) {
                throw new Error(`Error downloading file: ${error.message}`);
            } else {
                throw new Error('An unknown error occurred during download.');
            }
        }
    },

    async zip(id: string, filePaths: string[] | string, zipname: string): Promise<string> {
        try {
            const baseDirectory = path.resolve(`volumes/${id}`);
            
            const files = (Array.isArray(filePaths) ? filePaths : [filePaths])
                .flatMap(file => 
                    typeof file === 'string' 
                        ? file.split(',').map(f => f.trim()) 
                        : file
                )
                .map(file => ({
                    cleanPath: file.replace(/[\[\]"']/g, '').trim(),
                    fullPath: path.join(baseDirectory, file.replace(/[\[\]"']/g, '').trim())
                }));
    
            const firstFileDir = path.dirname(files[0].fullPath);
            const zipPath = path.join(firstFileDir, `${zipname}.zip`);
            
            await fs.mkdir(path.dirname(zipPath), { recursive: true });
    
            const zipStream = fsN.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });
    
            return new Promise((resolve, reject) => {
                archive.pipe(zipStream);
    
                archive.on('error', (err) => {
                    reject(new Error(`Archive error: ${err.message}`));
                });
    
                zipStream.on('close', () => {
                    resolve(zipPath);
                });
    
                (async () => {
                    for (const { cleanPath, fullPath } of files) {
                        try {
                            const exists = await fs.access(fullPath).then(() => true).catch(() => false);
    
                            if (!exists) {
                                console.warn(`File not found: ${cleanPath}`);
                                continue;
                            }
    
                            const stats = await fs.stat(fullPath);
                            if (stats.isDirectory()) {
                                archive.directory(fullPath, cleanPath);
                            } else {
                                archive.file(fullPath, { name: cleanPath });
                            }
                        } catch (err) {
                            console.warn(`Error processing ${cleanPath}:`, err);
                        }
                    }
    
                    await archive.finalize();
                })().catch((err) => {
                    reject(new Error(`Error during zipping process: ${err.message}`));
                });
            });
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Error creating zip: ${error.message}`);
            } else {
                throw new Error('An unknown error occurred during zip process');
            }
        }
    }
    
};

export default afs;
