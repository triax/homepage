#!/usr/bin/env -S pnpm exec tsx
// scripts/format-check.ts
// プロジェクト全体のフォーマットをチェック・修正するスクリプト

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface FormatIssue {
  file: string;
  line?: number;
  issue: string;
}

class FormatChecker {
  private issues: FormatIssue[] = [];
  private fixed: string[] = [];
  private isFixMode = false;

  constructor() {
    this.isFixMode = process.argv.includes('--fix');
  }

  async run() {
    console.log('🔍 Checking project formatting...\n');

    if (this.isFixMode) {
      console.log('🔧 Fix mode enabled - will automatically fix issues\n');
    }

    // 1. TypeScript/JavaScript files
    await this.checkTypeScriptFiles();

    // 2. YAML files
    await this.checkYamlFiles();

    // 3. HTML/CSS files
    await this.checkHtmlCssFiles();

    // 4. Markdown files
    await this.checkMarkdownFiles();

    // 5. JSON files
    await this.checkJsonFiles();

    // Report results
    this.reportResults();
  }

  private async checkTypeScriptFiles() {
    console.log('📝 Checking TypeScript/JavaScript files...');

    try {
      if (this.isFixMode) {
        const { stdout } = await execAsync('pnpm run lint:eslint -- --fix 2>&1');
        if (stdout.includes('problems')) {
          console.log('  ✅ Fixed TypeScript/JavaScript formatting issues');
          this.fixed.push('TypeScript/JavaScript files');
        }
      } else {
        const { stdout } = await execAsync('pnpm run lint:eslint 2>&1');
        if (stdout.includes('problems')) {
          const matches = stdout.match(/(\d+) problems?/);
          if (matches) {
            this.issues.push({
              file: 'TypeScript/JavaScript files',
              issue: `${matches[1]} ESLint issues found`
            });
          }
        }
      }
    } catch {
      // ESLint returns non-zero exit code when issues found
      if (!this.isFixMode) {
        this.issues.push({
          file: 'TypeScript/JavaScript files',
          issue: 'ESLint issues found (run with --fix to auto-fix)'
        });
      }
    }
  }

  private async checkYamlFiles() {
    console.log('📄 Checking YAML files...');

    for (const file of await this.listFiles('*.yml', '*.yaml')) {
      await this.checkTrailingSpaces(file);
    }
  }

  private async checkHtmlCssFiles() {
    console.log('🎨 Checking HTML/CSS/JS files...');

    const files = [
      'docs/index.html',
      'docs/index.css',
      'docs/index.js'
    ];

    for (const file of files) {
      try {
        await this.checkTrailingSpaces(file);
      } catch {
        // File not found
      }
    }
  }

  private async checkMarkdownFiles() {
    console.log('📚 Checking Markdown files...');

    for (const file of await this.listFiles('*.md')) {
      await this.checkTrailingSpaces(file);
    }
  }

  private async checkJsonFiles() {
    console.log('📦 Checking JSON files...');

    // package-lock.json は npm が生成するため対象外
    const files = (await this.listFiles('*.json'))
      .filter(file => file !== 'package-lock.json');

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        JSON.parse(content); // Check if valid JSON

        // Check formatting
        const formatted = JSON.stringify(JSON.parse(content), null, 2);
        if (content !== formatted && content !== formatted + '\n') {
          if (this.isFixMode) {
            await fs.writeFile(file, formatted + '\n', 'utf8');
            this.fixed.push(file);
          } else {
            this.issues.push({
              file,
              issue: 'JSON formatting inconsistent'
            });
          }
        }
      } catch {
        this.issues.push({
          file,
          issue: 'Invalid JSON'
        });
      }
    }
  }

  // 検査対象のファイルを git の pathspec で列挙する。
  // find ではなく git ls-files を使うことで、.gitignore 対象（.claude/ や
  // node_modules など）を自動的に除外し、除外ルールを .gitignore と整合させる。
  // --others で未追跡ファイルも含めるが、--exclude-standard で ignore 対象は除く。
  private async listFiles(...patterns: string[]): Promise<string[]> {
    const args = patterns.map(pattern => `'${pattern}'`).join(' ');
    const { stdout } = await execAsync(
      `git ls-files --cached --others --exclude-standard -z -- ${args}`
    );
    const files = stdout.split('\0').filter(Boolean);

    // 削除済みだが index に残っているファイルは除く
    const existing = await Promise.all(
      files.map(file => fs.access(file).then(() => file, () => null))
    );
    return existing.filter((file): file is string => file !== null);
  }

  private async checkTrailingSpaces(file: string) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const lines = content.split('\n');
      let hasTrailingSpaces = false;
      const issueLines: number[] = [];

      lines.forEach((line, index) => {
        if (line !== line.trimEnd()) {
          hasTrailingSpaces = true;
          issueLines.push(index + 1);
        }
      });

      if (hasTrailingSpaces) {
        if (this.isFixMode) {
          const fixed = lines.map(line => line.trimEnd()).join('\n');
          await fs.writeFile(file, fixed, 'utf8');
          this.fixed.push(file);
        } else {
          this.issues.push({
            file,
            issue: `Trailing spaces on lines: ${issueLines.slice(0, 5).join(', ')}${issueLines.length > 5 ? '...' : ''}`
          });
        }
      }
    } catch {
      // File not found or not readable
    }
  }

  private reportResults() {
    console.log('\n' + '='.repeat(60));

    if (this.isFixMode) {
      if (this.fixed.length === 0) {
        console.log('✅ No formatting issues found!');
      } else {
        console.log(`✨ Fixed ${this.fixed.length} file(s):\n`);
        this.fixed.forEach(file => {
          console.log(`  ✓ ${file}`);
        });
      }
    } else {
      if (this.issues.length === 0) {
        console.log('✅ All files are properly formatted!');
      } else {
        console.log(`❌ Found ${this.issues.length} formatting issue(s):\n`);
        this.issues.forEach(issue => {
          console.log(`  • ${issue.file}: ${issue.issue}`);
        });
        console.log('\n💡 Run with --fix flag to automatically fix these issues:');
        console.log('   pnpm run format:fix');
      }
    }

    console.log('='.repeat(60));

    // Exit with error code if issues found in check mode
    if (!this.isFixMode && this.issues.length > 0) {
      process.exit(1);
    }
  }
}

// Run the checker
const checker = new FormatChecker();
checker.run().catch(error => {
  console.error('Error running format checker:', error);
  process.exit(1);
});
