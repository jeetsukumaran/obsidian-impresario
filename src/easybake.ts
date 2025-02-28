import {
    App,
    ButtonComponent,
    Editor,
    MarkdownView,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    FileSystemAdapter,
    Setting,
    WorkspaceLeaf,
    CachedMetadata,
    TFile,
    TFolder,
    TAbstractFile,
} from 'obsidian';


async function generateRenderedMarkdown(app: App, file: TFile): Promise<boolean> {
    const easyBake = (app as any).plugins.getPlugin("obsidian-easy-bake");
    if (!easyBake) {
        console.error("obsidian-easy-bake is not installed or enabled.");
        return false;
    }

    const fileContents = await app.vault.read(file);

    // Ensure that bakeToString exists before calling it
    if (typeof easyBake.bakeToString === "function") {
        const renderedMarkdown = await easyBake.bakeToString(fileContents, app);
        console.log("Rendered Markdown:", renderedMarkdown);
        return true;
    } else {
        console.error("obsidian-easy-bake does not expose bakeToString.");
        return false;
    }
}

async function exportRenderedMarkdownToFile(app: App, file: TFile, outputPath: string): Promise<boolean> {
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
