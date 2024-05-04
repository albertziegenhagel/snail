
// import path from 'node:path';

// import * as win32_path from 'node:path/win32';
// import * as posix_path from 'node:path/posix';

// const document_platform = 'win32'
// const document_path = document_platform === 'win32' ? win32_path : posix_path;

export function getModuleDisplayName(modulePath: string) {
    // return path.basename(modulePath);
    let index = modulePath.lastIndexOf('/');
    if (index === -1) {
        index = modulePath.lastIndexOf('\\');
    }
    if (index === -1) {
        return modulePath;
    }
    return modulePath.substring(index + 1);
}
