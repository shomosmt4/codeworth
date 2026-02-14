import path from 'path';
export function computeDirectoryStats(files) {
    const statsMap = new Map();
    for (const file of files) {
        const dir = path.dirname(file.path);
        // Aggregate for the immediate parent directory
        // In a full implementation we might want recursive aggregation, 
        // but for v1 "Top Folders" usually means top-level or immediate parents.
        // Let's settle on: distinct directories found in file paths.
        if (!statsMap.has(dir)) {
            statsMap.set(dir, {
                path: dir,
                files: 0,
                loc: { code: 0, comment: 0, blank: 0 }
            });
        }
        const stat = statsMap.get(dir);
        stat.files++;
        stat.loc.code += file.loc.code;
        stat.loc.comment += file.loc.comment;
        stat.loc.blank += file.loc.blank;
    }
    return Array.from(statsMap.values()).sort((a, b) => b.loc.code - a.loc.code);
}
