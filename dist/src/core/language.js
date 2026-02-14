export const LANGUAGE_MAP = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.py': 'Python',
    '.lua': 'Lua',
    '.html': 'HTML',
    '.css': 'CSS',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.md': 'Markdown',
    '.sh': 'Shell',
    '.bash': 'Shell',
    '.go': 'Go',
    '.java': 'Java',
    '.c': 'C',
    '.cpp': 'C++',
    '.h': 'C/C++ Header',
    '.rs': 'Rust',
    '.rb': 'Ruby',
    '.php': 'PHP'
};
export function getLanguage(filename) {
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    return LANGUAGE_MAP[ext] || 'Other';
}
