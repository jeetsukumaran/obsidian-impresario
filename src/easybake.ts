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

    const easyBake = (app as any).plugins.getPlugin("obsidian-easy-bake");
    if (!easyBake) {
        console.error("obsidian-easy-bake is not installed or enabled.");
        return false;
    }

    const fileContents = await app.vault.read(file);

    if (typeof easyBake.bakeToString === "function") {
        const renderedMarkdown = await easyBake.bakeToString(fileContents, app);
        console.log("Rendered Markdown:", renderedMarkdown);
        return true;
    } else {
        console.error("obsidian-easy-bake does not expose bakeToString.");
        return false;
    }
}

export async function exportRenderedMarkdownToFile(app: App, sourceFilePath: string, outputPath: string): Promise<boolean> {
    const file = app.vault.getAbstractFileByPath(sourceFilePath);

    if (!(file instanceof TFile)) {
        console.error(`File not found: ${sourceFilePath}`);
        return false;
    }

    const easyBake = (app as any).plugins.getPlugin("obsidian-easy-bake");
    if (!easyBake) {
        console.error("obsidian-easy-bake is not installed or enabled.");
        return false;
    }

    const fileContents = await app.vault.read(file);

    if (typeof easyBake.bakeToFile === "function") {
        await easyBake.bakeToFile(fileContents, app, outputPath);
        console.log(`Rendered markdown saved to ${outputPath}`);
        return true;
    } else {
        console.error("obsidian-easy-bake does not expose bakeToFile.");
        return false;
    }
}

