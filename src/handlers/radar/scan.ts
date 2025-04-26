import path from 'path';
import fs from 'fs/promises';
import { glob } from 'glob';
import logger from '../../utils/logger';

interface Pattern {
  type: 'filename' | 'extension' | 'content';
  pattern: string;
  description: string;
  content?: string;
  size_less_than?: number;
  size_greater_than?: number;
}

interface RadarScript {
  name: string;
  description: string;
  version: string;
  patterns: Pattern[];
}

interface ScanResult {
  pattern: Pattern;
  matches: {
    path: string;
    size?: number;
  }[];
}

export const scanVolume = async (id: string, script: RadarScript): Promise<ScanResult[]> => {
  try {
    logger.info(`Starting radar scan on volume ${id} using script: ${script.name}`);
    const baseDirectory = path.resolve(`volumes/${id}`);
    const results: ScanResult[] = [];

    try {
      await fs.access(baseDirectory);
    } catch (error) {
      logger.error(`Volume directory for ${id} does not exist`, error);
      throw new Error(`Volume directory for ${id} does not exist`);
    }

    for (const pattern of script.patterns) {
      const scanResult: ScanResult = {
        pattern,
        matches: []
      };

      try {
        let files: string[] = [];
        if (pattern.type === 'filename') {
          files = await glob(`**/*${pattern.pattern}*`, {
            cwd: baseDirectory,
            nodir: false,
            dot: true
          });
        } else if (pattern.type === 'extension') {
          files = await glob(`**/*${pattern.pattern}`, {
            cwd: baseDirectory,
            nodir: true,
            dot: true
          });
        } else if (pattern.type === 'content') {
          logger.warn(`Content scanning not fully implemented for pattern: ${pattern.pattern}`);
          continue;
        }

        for (const file of files) {
          const filePath = path.join(baseDirectory, file);
          const stats = await fs.stat(filePath);

          if (stats.isDirectory() && (pattern.type === 'extension' || pattern.content)) {
            continue;
          }

          if (pattern.size_less_than && stats.size >= pattern.size_less_than) {
            continue;
          }

          if (pattern.size_greater_than && stats.size <= pattern.size_greater_than) {
            continue;
          }

          if (pattern.content) {
            try {
              if (stats.size < 10 * 1024 * 1024) {
                const content = await fs.readFile(filePath, 'utf-8');
                const contentRegex = new RegExp(pattern.content, 'i');
                if (!contentRegex.test(content)) {
                  continue;
                }
              } else {
                logger.debug(`Skipping content scan for large file: ${file}`);
                continue;
              }
            } catch (error) {
              logger.debug(`Skipping binary or unreadable file: ${file}`);
              continue;
            }
          }

          scanResult.matches.push({
            path: file,
            size: stats.size
          });
        }

        if (scanResult.matches.length > 0) {
          results.push(scanResult);
        }
      } catch (error) {
        logger.error(`Error processing pattern ${pattern.pattern}:`, error);
      }
    }

    logger.info(`Radar scan completed on volume ${id}. Found ${results.reduce((sum, r) => sum + r.matches.length, 0)} matches across ${results.length} patterns.`);
    return results;
  } catch (error) {
    logger.error(`Failed to scan volume ${id}:`, error);
    throw error;
  }
};
