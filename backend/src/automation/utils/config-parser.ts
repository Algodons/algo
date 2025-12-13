/**
 * Utility for parsing various configuration file formats
 */
export class ConfigParser {
  /**
   * Parse package.json and extract relevant information
   */
  parsePackageJson(content: any): {
    name: string;
    version: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } {
    return {
      name: content.name || 'unknown',
      version: content.version || '0.0.0',
      scripts: content.scripts || {},
      dependencies: content.dependencies || {},
      devDependencies: content.devDependencies || {},
    };
  }

  /**
   * Parse requirements.txt and extract dependencies
   */
  parseRequirementsTxt(content: string): string[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split('==')[0].split('>=')[0].split('<=')[0].trim());
  }

  /**
   * Parse Cargo.toml and extract relevant information
   */
  parseCargoToml(content: string): {
    name: string;
    version: string;
    dependencies: string[];
  } {
    const nameMatch = content.match(/name\s*=\s*"([^"]+)"/);
    const versionMatch = content.match(/version\s*=\s*"([^"]+)"/);
    
    // Extract dependencies section
    const depsMatch = content.match(/\[dependencies\]([\s\S]*?)(\[|$)/);
    const dependencies: string[] = [];
    
    if (depsMatch) {
      const depsSection = depsMatch[1];
      const depLines = depsSection.split('\n');
      
      for (const line of depLines) {
        const depMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=/);
        if (depMatch) {
          dependencies.push(depMatch[1]);
        }
      }
    }
    
    return {
      name: nameMatch ? nameMatch[1] : 'unknown',
      version: versionMatch ? versionMatch[1] : '0.0.0',
      dependencies,
    };
  }

  /**
   * Parse pom.xml and extract project information
   */
  parsePomXml(content: string): {
    groupId: string;
    artifactId: string;
    version: string;
  } {
    const groupIdMatch = content.match(/<groupId>([^<]+)<\/groupId>/);
    const artifactIdMatch = content.match(/<artifactId>([^<]+)<\/artifactId>/);
    const versionMatch = content.match(/<version>([^<]+)<\/version>/);
    
    return {
      groupId: groupIdMatch ? groupIdMatch[1] : 'unknown',
      artifactId: artifactIdMatch ? artifactIdMatch[1] : 'unknown',
      version: versionMatch ? versionMatch[1] : '0.0.0',
    };
  }

  /**
   * Parse go.mod and extract module information
   */
  parseGoMod(content: string): {
    module: string;
    goVersion: string;
    dependencies: string[];
  } {
    const moduleMatch = content.match(/module\s+([^\s]+)/);
    const goVersionMatch = content.match(/go\s+([^\s]+)/);
    
    const dependencies: string[] = [];
    const requireMatch = content.match(/require\s*\(([\s\S]*?)\)/);
    
    if (requireMatch) {
      const requireSection = requireMatch[1];
      const lines = requireSection.split('\n');
      
      for (const line of lines) {
        const depMatch = line.trim().match(/^([^\s]+)\s+/);
        if (depMatch) {
          dependencies.push(depMatch[1]);
        }
      }
    }
    
    return {
      module: moduleMatch ? moduleMatch[1] : 'unknown',
      goVersion: goVersionMatch ? goVersionMatch[1] : '1.0',
      dependencies,
    };
  }

  /**
   * Parse composer.json and extract PHP project information
   */
  parseComposerJson(content: any): {
    name: string;
    version: string;
    require: Record<string, string>;
  } {
    return {
      name: content.name || 'unknown',
      version: content.version || '0.0.0',
      require: content.require || {},
    };
  }

  /**
   * Extract environment variables from content
   */
  extractEnvVariables(content: string): string[] {
    const envVars = new Set<string>();
    
    // Match process.env.VAR_NAME (JavaScript/TypeScript) - supports both UPPER_CASE and camelCase
    const jsMatches = content.matchAll(/process\.env\.([A-Z_][A-Za-z0-9_]*)/g);
    for (const match of jsMatches) {
      envVars.add(match[1]);
    }
    
    // Match os.getenv('VAR_NAME') or os.environ['VAR_NAME'] (Python) - flexible casing
    const pyMatches = content.matchAll(/(?:os\.getenv|os\.environ(?:\.get)?)\s*\(\s*['"]([A-Z_][A-Za-z0-9_]*)['"]?\s*\)/g);
    for (const match of pyMatches) {
      envVars.add(match[1]);
    }
    
    // Match env::var("VAR_NAME") (Rust) - flexible casing
    const rustMatches = content.matchAll(/env::var\(\s*"([A-Z_][A-Za-z0-9_]*)"\s*\)/g);
    for (const match of rustMatches) {
      envVars.add(match[1]);
    }
    
    // Match os.Getenv("VAR_NAME") (Go) - flexible casing
    const goMatches = content.matchAll(/os\.Getenv\(\s*"([A-Z_][A-Za-z0-9_]*)"\s*\)/g);
    for (const match of goMatches) {
      envVars.add(match[1]);
    }
    
    return Array.from(envVars);
  }

  /**
   * Parse port numbers from configuration files
   */
  extractPorts(content: string): number[] {
    const ports = new Set<number>();
    
    // Match common port patterns
    const patterns = [
      /port[:\s=]+(\d+)/gi,
      /PORT[:\s=]+(\d+)/g,
      /listen[:\s]+(\d+)/gi,
      /\.listen\((\d+)\)/g,
    ];
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const port = parseInt(match[1]);
        if (port >= 1 && port <= 65535) {
          ports.add(port);
        }
      }
    }
    
    return Array.from(ports);
  }
}
