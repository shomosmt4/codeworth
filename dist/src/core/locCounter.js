import fs from 'fs/promises';
const COMMENT_STYLES = {
    'JavaScript': { single: ['//'], multi: ['/*', '*/'] },
    'TypeScript': { single: ['//'], multi: ['/*', '*/'] },
    'Python': { single: ['#'], multi: ['"""', '"""'] }, // approximate
    'Lua': { single: ['--'], multi: ['--[[', ']]'] },
    'HTML': { multi: ['<!--', '-->'] },
    'CSS': { multi: ['/*', '*/'] },
    'C': { single: ['//'], multi: ['/*', '*/'] },
    'C++': { single: ['//'], multi: ['/*', '*/'] },
    'Java': { single: ['//'], multi: ['/*', '*/'] },
    'Rust': { single: ['//'], multi: ['/*', '*/'] },
    'Go': { single: ['//'], multi: ['/*', '*/'] },
    'Shell': { single: ['#'] },
    'Ruby': { single: ['#'] },
    'PHP': { single: ['//', '#'], multi: ['/*', '*/'] },
};
export async function countLoc(filepath, language) {
    try {
        const content = await fs.readFile(filepath, 'utf-8');
        if (!content)
            return { code: 0, comment: 0, blank: 0 };
        const lines = content.split(/\r?\n/);
        const style = COMMENT_STYLES[language];
        if (!style)
            return countSimple(lines);
        return countWithStyle(lines, style);
    }
    catch (e) {
        return { code: 0, comment: 0, blank: 0 };
    }
}
function countSimple(lines) {
    let code = 0;
    let blank = 0;
    for (const line of lines) {
        if (line.trim().length === 0)
            blank++;
        else
            code++;
    }
    return { code, comment: 0, blank };
}
function countWithStyle(lines, style) {
    let code = 0;
    let comment = 0;
    let blank = 0;
    let inMultiComment = false;
    const multiStart = style.multi?.[0];
    const multiEnd = style.multi?.[1];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) {
            if (inMultiComment)
                comment++;
            else
                blank++;
            continue;
        }
        if (inMultiComment && multiEnd) {
            comment++;
            if (trimmed.includes(multiEnd))
                inMultiComment = false;
            continue;
        }
        if (multiStart && trimmed.startsWith(multiStart)) {
            comment++;
            if (multiEnd && !trimmed.includes(multiEnd))
                inMultiComment = true;
            continue;
        }
        if (isSingleLineComment(trimmed, style.single)) {
            comment++;
            continue;
        }
        code++;
    }
    return { code, comment, blank };
}
function isSingleLineComment(line, tokens) {
    if (!tokens)
        return false;
    for (const token of tokens) {
        if (line.startsWith(token))
            return true;
    }
    return false;
}
