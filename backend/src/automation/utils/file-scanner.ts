import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Utility for scanning project files and directories
 */
export class FileScanner {
  /**
   * Check if a file exists in the project directory
   */
  async fileExists(projectPath: string, filename: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectPath, filename));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read and parse JSON file
   */
  async readJsonFile(projectPath: string, filename: string): Promise<any> {
    try {
      const filePath = path.join(projectPath, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read JSON file ${filename}: ${error}`);
    }
  }

  /**
   * Read text file content
   */
  async readTextFile(projectPath: string, filename: string): Promise<string> {
    try {
      const filePath = path.join(projectPath, filename);
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read text file ${filename}: ${error}`);
    }
  }

  /**
   * Search for files matching a pattern
   */
  async findFiles(projectPath: string, pattern: RegExp): Promise<string[]> {
    const results: string[] = [];
    
    async function scanDir(dirPath: string) {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.relative(projectPath, fullPath);
          
          // Skip node_modules and hidden directories
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }
          
          if (entry.isDirectory()) {
            await scanDir(fullPath);
          } else if (entry.isFile() && pattern.test(entry.name)) {
            results.push(relativePath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    await scanDir(projectPath);
    return results;
  }

  /**
   * Get list of all files in directory
   */
  async listFiles(projectPath: string, maxDepth: number = 2): Promise<string[]> {
    const results: string[] = [];
    
    async function scanDir(dirPath: string, currentDepth: number) {
      if (currentDepth > maxDepth) return;
      
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.relative(projectPath, fullPath);
          
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }
          
          if (entry.isDirectory()) {
            await scanDir(fullPath, currentDepth + 1);
          } else if (entry.isFile()) {
            results.push(relativePath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    await scanDir(projectPath, 0);
    return results;
  }

  /**
   * Search for specific content in files
   */
  async searchInFiles(
    projectPath: string, 
    pattern: RegExp, 
    fileExtensions: string[]
  ): Promise<Array<{ file: string; matches: string[] }>> {
    const results: Array<{ file: string; matches: string[] }> = [];
    const files = await this.listFiles(projectPath);
    
    for (const file of files) {
      const ext = path.extname(file);
      if (!fileExtensions.includes(ext)) continue;
      
      try {
        const content = await this.readTextFile(projectPath, file);
        const matches = content.match(pattern);
        
        if (matches && matches.length > 0) {
          results.push({ file, matches: Array.from(new Set(matches)) });
        }
      } catch {
        // Skip files we can't read
      }
    }
    
    return results;
  }
}
