import {
    App,
    TFile,
} from 'obsidian';

export async function generateRenderedMarkdown(app: App, sourceFilePath: string): Promise<boolean> {
    const file = app.vault.getAbstractFileByPath(sourceFilePath);

    if (!(file instanceof TFile)) {
        console.error(`File not found: ${sourceFilePath}`);
        return false;
    }

    const easyBake = (app as any).plugins.getPlugin("easy-bake");
    if (!easyBake) {
        console.error("obsidian-easy-bake is not installed or enabled.");
        return false;
    }

    return false;
}

export async function exportRenderedMarkdownToFile(app: App, sourceFilePath: string, outputPath: string): Promise<boolean> {
    const file = app.vault.getAbstractFileByPath(sourceFilePath);

    if (!(file instanceof TFile)) {
        console.error(`File not found: ${sourceFilePath}`);
        return false;
    }

    const easyBake = (app as any).plugins.getPlugin("easy-bake");
    if (!easyBake) {
        console.error("obsidian-easy-bake is not installed or enabled.");
        return false;
    }

    return false;
    // const fileContents = await app.vault.read(file);
    // console.log(easyBake);
    // const bakeFn = easyBake.api.bakeToFile;
    // if (typeof bakeFn === "function") {
    //     await bakeFn(fileContents, app, outputPath);
    //     console.log(`Rendered markdown saved to ${outputPath}`);
    //     return true;
    // } else {
    //     console.error("obsidian-easy-bake does not expose bakeToFile.");
    //     return false;
    // }
}

