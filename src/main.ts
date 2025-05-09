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
    normalizePath,
} from 'obsidian';
import {
    BakeSettings,
    EasyBakeApi,
} from "./easybake";
import { spawn, exec } from "child_process";
import * as path from "path";
import * as os from 'os';
import * as fs from "fs";
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

interface ImpresarioSettings {
    configuration: { [key: string]: string };
}

const DEFAULT_SETTINGS: ImpresarioSettings = {
    configuration: {
    },
}

let impresarioPropertyProductionParameterMap: {
    [key: string]: string | string[] | undefined,
}

interface FrontmatterCache {
    [key: string]: string | number | boolean | string[] | number[] | Record<string, any> | undefined;
    title?: string;
    date?: string;
    tags?: string[];
}

class ProductionParameter {
    label = "Parameter"
    value: string | number
}

const fileExists = (filePath: string, app: App): boolean => {
    if (path.isAbsolute(filePath)) {
        return fs.existsSync(filePath);
    } else {
        return app.vault.getAbstractFileByPath(filePath) !== null;
    }
};


class ProductionSetupModal extends Modal {

    outputFormatMap: { [key: string]: string } = { // {{{
        asciidoc: '.adoc',
        asciidoc_legacy: '.asciidoc',
        asciidoctor: '.adoc',
        beamer: '.pdf',
        biblatex: '.bib',
        bibtex: '.bib',
        chunkedhtml: '.html',
        commonmark: '.md',
        commonmark_x: '.md',
        context: '.tex',
        csljson: '.json',
        docbook: '.xml',
        docbook4: '.xml',
        docbook5: '.xml',
        docx: '.docx',
        dokuwiki: '.txt',
        dzslides: '.html',
        epub: '.epub',
        epub2: '.epub',
        epub3: '.epub',
        fb2: '.fb2',
        gfm: '.md',
        haddock: '.haddock',
        html: '.html',
        html4: '.html',
        html5: '.html',
        icml: '.icml',
        ipynb: '.ipynb',
        jats: '.xml',
        jats_archiving: '.xml',
        jats_articleauthoring: '.xml',
        jats_publishing: '.xml',
        jira: '.txt',
        json: '.json',
        latex: '.tex',
        man: '.man',
        markdown: '.md',
        markdown_github: '.md',
        markdown_mmd: '.md',
        markdown_phpextra: '.md',
        markdown_strict: '.md',
        markua: '.md',
        mediawiki: '.txt',
        ms: '.ms',
        muse: '.muse',
        native: '.native',
        odt: '.odt',
        opendocument: '.odt',
        opml: '.opml',
        org: '.org',
        pdf: '.pdf',
        plain: '.txt',
        pptx: '.pptx',
        revealjs: '.html',
        rst: '.rst',
        rtf: '.rtf',
        s5: '.html',
        slideous: '.html',
        slidy: '.html',
        tei: '.xml',
        texinfo: '.texi',
        textile: '.textile',
        typst: '.typst',
        xwiki: '.txt',
        zimwiki: '.txt'
    };

    sourceFile: TFile
    sourceFilePath: string
    sourceFileSubdirectory: string
    outputSubpath: string
    outputAbsolutePath: string
    metadataCache: CachedMetadata
    vaultRootPath: string
    argumentValueMap: { [key: string]: string | string[] }
    isAutoOpenOutput: boolean
    isAutoClose: boolean
    settings: ImpresarioSettings

    constructor(
        app: App,
        sourceFile: TFile,
        isAutoOpenOutput: boolean,
        isAutoClose: boolean,
        settings: ImpresarioSettings,
    ) {
        super(app);
        this.refreshSourceData(sourceFile);
        this.isAutoOpenOutput = isAutoOpenOutput;
        this.isAutoClose = isAutoClose;
        this.settings = settings;
    }

    refreshSourceData(sourceFile: TFile) {
        this.sourceFile = sourceFile
        this.sourceFilePath = sourceFile.path
        this.vaultRootPath = this.getVaultBasePath();
        this.sourceFileSubdirectory = sourceFile.parent?.path || ""
        this.metadataCache = this.app.metadataCache.getFileCache(this.sourceFile) || {}
    }

    getVaultBasePath(): string {
        const adapter = app.vault.adapter;
        if (adapter instanceof FileSystemAdapter) {
            return adapter.getBasePath();
        }
        return "";
    }

    composeLocalAbsolutePath(
        fileBaseName: string,
        extension: string = "",
        fileDirectory: string = "",
    ): string {
        return path.join(this.vaultRootPath, fileDirectory, fileBaseName + (extension.startsWith(".") ? extension : ("." + extension)));
    }

    composeAbsolutePath(subpath: string): string {
        return path.join(this.vaultRootPath, subpath)
    }

    composeOutputAbsolutePath(formatName: string, outputSubdirectory: string): string {
        return this.composeAbsolutePath(this.composeOutputSubpath(formatName, outputSubdirectory))
    }

    composeOutputSubpath(formatName: string, outputSubdirectory: string): string {
        return path.join(outputSubdirectory, this.composeOutputBase(formatName))
    }

    composeOutputBase(formatName: string): string {
        const sourceFileSubpath = this.sourceFilePath
        const outputExtension = this.outputFormatMap[formatName] || ""
        return path.parse(this.sourceFilePath).name + outputExtension
    }

    get sourceFileAbsolutePath() {
        return this.composeAbsolutePath(this.sourceFilePath)
    }

    readPropertyString(
        key: string,
        defaultValue?: string
    ): string {
        if (!this.metadataCache?.frontmatter?.[key]) {
            return defaultValue || defaultValue || ""
        }
        const propertyValue = this.metadataCache?.frontmatter?.[key] || ""
        if (Array.isArray(propertyValue)) {
            return propertyValue.join("")
        } else {
            return propertyValue.toString()
        }
    }

    readPropertyList(
        key: string,
        defaultValue?: string[],
    ): string[] {
        if (!this.metadataCache?.frontmatter?.[key]) {
            return defaultValue || []
        }
        const propertyValue = this.metadataCache?.frontmatter?.[key] || ""
        if (!propertyValue) {
            return []
        }
        if (Array.isArray(propertyValue)) {
            return propertyValue
        } else {
            return [propertyValue.toString()]
        }
    }

    defaultOutputFormat(): string {
        let outputFormatPropertyName = this.resolveArgumentValue(
            {},
            "",
            "",
            "outputFormatPropertyName",
            () => "output-format"
        )
        return this.readPropertyString(outputFormatPropertyName, "pdf")
    }

    defaultOutputDirectory(): string {
        let rval = this.resolveArgumentValue(
            {},
            "output-directory",
            "defaultOutputDirectory",
            "defaultOutputDirectoryPropertyName",
            () => "storage/artifacts",
        )
        return rval;
    }

    defaultSlideLevel(): string {
        return this.readPropertyString(
            "production-slide-level",
            "2",
        )
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h3", { text: "Production Output" });

        contentEl.createEl("h4", { text: "Output Format" });

        const outputFormatContainer: HTMLElement = contentEl.createEl("div", {cls: "impresario-modal-input-container"})
        const formatDropdown = outputFormatContainer.createEl('select', {cls: ["impresario-modal-input-element"]});
        Object.entries(this.outputFormatMap).forEach(([formatName, formatExtension]) => {
            const option = formatDropdown.createEl('option', { text: formatName, value: formatName });
            if (formatName === this.defaultOutputFormat()) {
                option.selected = true;
            }
        });

        contentEl.createEl("h4", { text: "Output Directory" });
        const outputDirectoryInputContainer: HTMLElement = contentEl.createEl("div", {cls: "impresario-modal-input-container"})
        const outputDirectoryInput = outputDirectoryInputContainer.createEl('textarea', {
            cls: ["impresario-modal-input-element"],
        });
        outputDirectoryInput.textContent = this.defaultOutputDirectory()
        contentEl.createEl("h4", { text: "Output Path" });
        const outputAnnotationContainer = contentEl.createEl('div', {
            cls: ["impresario-modal-annotation"],
        });
        const updateAnnotation = () => {
            this.outputSubpath = this.composeOutputSubpath(
                formatDropdown.value || "",
                outputDirectoryInput.value || "",
            )
            this.outputAbsolutePath = this.composeAbsolutePath(this.outputSubpath)
            outputAnnotationContainer.setText(this.outputAbsolutePath)
        };
        formatDropdown.addEventListener('change', updateAnnotation);
        outputDirectoryInput.addEventListener('input', updateAnnotation);
        updateAnnotation(); // Initial update

        contentEl.createEl("br")
        contentEl.createEl("br")
        const finalButtonsContainer = new Setting(contentEl)
        let isVerbose = false;
        finalButtonsContainer.controlEl.appendChild(document.createTextNode("Verbose"));
        const verbosityToggle = finalButtonsContainer.addToggle( toggle => {
            toggle.setValue(isVerbose)
                .onChange(async (value) => {
                    isVerbose = value
//
//
//

                })
        });
        finalButtonsContainer.addButton((button: ButtonComponent) => {
            button
                .setButtonText("Produce!")
                .onClick(async () => {
                    await this.execute(
                        "pandoc",
                        {
                            outputFormat: formatDropdown.value,
                            outputSubpath: this.outputSubpath,
                            outputAbsolutePath: this.outputAbsolutePath,
                            verbosity: isVerbose ? "true" : "",
                        },
                    );
                    this.close();
                });
        });

        finalButtonsContainer.addButton((button: ButtonComponent) => {
            button
                .setButtonText("Produce (Split Bibliography)")
                .onClick(() => {
                    this.produceSplitBibliography(
                        isVerbose,
                        formatDropdown.value,
                        outputDirectoryInput.value
                    );
                    this.close();
                });
        });
    }

    async produceSplitBibliography(
        isVerbose: boolean,
        outputFormat: string,
        outputDirectory: string
    ) {
        const outputSubpathWithoutBibliography = this.composeLocalAbsolutePath(
            path.parse(this.sourceFilePath).name,
            this.outputFormatMap[outputFormat],
            outputDirectory,
        );
        const outputSubpathBibliographyOnly = this.composeLocalAbsolutePath(
            path.parse(this.sourceFilePath).name + ".references",
            this.outputFormatMap[outputFormat],
            outputDirectory,
        );
        await this.execute(
            "pandoc",
            {
                outputFormat: outputFormat,
                outputSubpath: outputSubpathWithoutBibliography,
                outputAbsolutePath: outputSubpathWithoutBibliography,
                verbosity: isVerbose ? "true" : "",
                isSuppressBibliography: "true",
            },
        );
        await this.execute(
            "pandoc",
            {
                outputFormat: outputFormat,
                outputSubpath: outputSubpathBibliographyOnly,
                outputAbsolutePath: outputSubpathBibliographyOnly,
                verbosity: isVerbose ? "true" : "",
                isBibliographyOnly: "true",
            },
        );

    }

    async backgroundRun(isSplitBibliography: boolean = false, isVerbose: boolean = false) {
        let outputFormat = this.defaultOutputFormat();
        let outputDirectory = this.defaultOutputDirectory();
        this.outputSubpath = this.composeOutputSubpath(
            outputFormat || "",
            outputDirectory || "",  // Changed from textContent to value
        );
        if (isSplitBibliography) {
            await this.produceSplitBibliography(
                isVerbose,
                outputFormat,
                outputDirectory,
            )
        } else {
            await this.execute(
                "pandoc",
                {
                    outputFormat: outputFormat,
                    outputSubpath: this.outputSubpath,
                    outputAbsolutePath: this.composeAbsolutePath(this.outputSubpath),
                    verbosity: isVerbose ? "true" : "",
                },
            );
        }
    }

    composeResourcePath(...subpaths: string[]): string {
        return path.join(
            this.vaultRootPath,
            ".obsidian",
            "plugins",
            "obsidian-impresario",
            "resources",
            ...subpaths,
        );
    }

    resolveArgumentValue(
        configArgs: { [key: string]: string },
        configKey: string,
        propertyName: string,
        settingsName: string,
        defaultValueFn: () => string,
    ): string {
        let rval: string | null = null;
        rval = this.settings.configuration[settingsName] || rval;
        rval = this.readPropertyString(propertyName, "") || rval;
        rval = configArgs[configKey] || rval;
        if (!rval && defaultValueFn) {
            rval = defaultValueFn();
        }
        return rval || "";
    }

    composeArgs(pandocSourceFilePath: string, configArgs: { [key: string]: string }): string[] {
        const outputAbsolutePath = configArgs.outputAbsolutePath;
        const fromElements = [
            "markdown",
            "wikilinks_title_after_pipe",
            "pipe_tables",
            "backtick_code_blocks",
            "auto_identifiers",
            "strikeout",
            "yaml_metadata_block",
            // "implicit_figures",
            "smart",
            "fenced_divs",
            "citations",
            "link_attributes",
        ];
        const args = [
            "--from", fromElements.join("+"),
            "--standalone",
            "-t", configArgs.outputFormat,
            "--resource-path", this.vaultRootPath,
            pandocSourceFilePath,
            "-o", outputAbsolutePath,
        ];
        if (true) {
            args.push(...[
                "--lua-filter", this.composeResourcePath("publication", "pandoc", "filters", "drawio.lua"),
                "--lua-filter", this.composeResourcePath("publication", "pandoc", "filters", "stripTagsFromHeaders.lua"),
                "--lua-filter", this.composeResourcePath("publication", "pandoc", "filters", "scratch.lua"),
                "--lua-filter", this.composeResourcePath("publication", "pandoc", "filters", "imageAttrs.lua"),
                "--lua-filter", this.composeResourcePath("publication", "pandoc", "filters", "citationlinks.lua"),
                "--filter", this.composeResourcePath("publication", "pandoc", "filters", "tikzblock.py")
            ]);
        }
        if (configArgs.verbosity) {
            args.push("--verbose");
        }
        if (configArgs.isBibliographyOnly) {
            args.push(... ["--lua-filter", this.composeResourcePath("publication", "pandoc", "filters", "bibonly.lua")]);
            args.push("-M");
            args.push("title=References");
        }
        const extractPath = (item: string) => normalizePath(item?.trim().replace(/^\[\[/g, "").replace(/\]\]$/g, ""));
        if (true) {
            args.push("--citeproc");
            const bibliographyDataPaths: string[] = [];
            let customBibPath = this.resolveArgumentValue(configArgs, "defaultBibliographyPath", "bibliographic-database-path", "bibliographyPath", () => "");
            if (customBibPath) {
                const extractedPath = extractPath(customBibPath);
                if (fileExists(extractedPath, this.app)) {
                    bibliographyDataPaths.push(extractedPath);
                } else {
                    console.warn(`Not adding non-existing bibliography file '${extractedPath}`);
                }
            }
            bibliographyDataPaths.push(...this.readPropertyList("bibliography").map(extractPath));
            bibliographyDataPaths.forEach((bdPath) => args.push(...["--bibliography", bdPath]));
            args.push(...this.readPropertyList("resource-path").map(extractPath));
            args.push(...this.readPropertyList("resource-paths").map(extractPath));
        }
        if (configArgs.isSuppressBibliography) {
            args.push("-M");
            args.push("suppress-bibliography=true");
            args.push("-M");
            args.push("link-citations=false");
        }
        const includeInHeader: string[] = this.readPropertyList("include-in-header", []);
        if (includeInHeader) {
            includeInHeader.forEach((item: string) => {
                const itemPath = extractPath(item);
                if (itemPath) {
                    args.push("--include-in-header");
                    args.push(itemPath);
                }
            });
        }
        // const headerIncludes: string[] = this.readPropertyList("header-includes", []);
        // if (headerIncludes) {
        //     headerIncludes.forEach((item: string) => {
        //         item = item.trim();
        //         if (item) {
        //             args.push(`--metadata=header-includes:${item}`);
        //         }
        //     });
        // }
        const shiftHeadingLevelBy = this.resolveArgumentValue(configArgs, "shiftHeadingLevelBy", "shift-heading-level-by", "shiftHeadingLevelBy", () => "");
        const layout = this.resolveArgumentValue(configArgs, "layout", "layout", "layout", () => "");
        if (shiftHeadingLevelBy !== "") {
            args.push("--shift-heading-level-by");
            args.push(shiftHeadingLevelBy);
        }
        if (true) {
            args.push("--filter", "mermaid-filter");
        }
        if (true) {
            args.push(...[
                "--lua-filter", this.composeResourcePath("publication", "pandoc", "filters", "callouts.lua"),
                "--lua-filter", this.composeResourcePath("publication", "pandoc", "filters", "boxes.lua")
            ]);
        }
        if (
                configArgs.outputFormat === "slidy"
                || configArgs.outputFormat === "html5"
                || configArgs.outputFormat === "revealjs") {
            args.push("--standalone");
            args.push("--embed-resources");
        }
        if (configArgs.outputFormat === "revealjs") {
            // args.push("-V revealjs-url=http://lab.hakim.se/reveal-js");
            // args.push("-V revealjs-url=-V revealjs-url=https://cdn.jsdelivr.net/npm/reveal.js@4.6.1");
            // args.push("-V revealjs-url=https://cdn.jsdelivr.net/npm/reveal.js");
            args.push("-V");
            args.push("revealjs-url=https://cdn.jsdelivr.net/npm/reveal.js");
            // args.push("revealjs-url=/home/jeetsukumaran/site/storage/local/note/service/obsidian/plugins/20231228_obsidian-impresario/obsidian-impresario/resources/publication/revealjs/reveal.js-master/dist/");
        }
        if (configArgs.outputFormat === "pdf" || configArgs.outputFormat === "beamer") {
            args.push("--include-in-header", this.composeResourcePath(
                "publication",
                "pandoc",
                "templates",
                "packages.latex"
            ));
            args.push("--include-in-header", this.composeResourcePath(
                "publication",
                "pandoc",
                "templates",
                "quoteblocks.latex"
            ));
            if (layout === "compact") {
                args.push("--include-in-header", this.composeResourcePath("publication", "pandoc", "templates", "compact-structure.latex"));
            }
        }
        if (configArgs.outputFormat === "beamer") {
            let slideLevel = this.resolveArgumentValue(configArgs, "defaultSlideLevel", "slide-level", "slideLevel", () => "2");
            args.push("--slide-level", slideLevel);
            args.push("--include-in-header", this.composeResourcePath("publication", "pandoc", "templates", "beamer-preamble.tex"));
        }
        args.push("--pdf-engine", "xelatex")
        // args.push("--pdf-engine", "lualatex")
        return args;
    }

    async execute(
        commandPath: string,
        configArgs: { [key: string]: string }
    ) {

        let pandocSourceFilePath = this.sourceFilePath;
        let tempFilePath: string | null = null;
        let isEasyBake = true;

        if (isEasyBake) {
            const easyBakeApi = new EasyBakeApi(app);
            const bakeSettings = {
                bakeLinks: true,
                bakeEmbeds: true,
                bakeInList: true,
                convertFileLinks: true,
            };
            const compiledSourceData = await easyBakeApi.bakeToString(this.sourceFilePath, bakeSettings);
            if (compiledSourceData?.trim()) {
                try {
                    tempFilePath = join(tmpdir(), `pandoc_temp_${Date.now()}.md`);
                    if (tempFilePath !== null && tempFilePath) {
                        await writeFile(tempFilePath, compiledSourceData, 'utf8');
                        pandocSourceFilePath = tempFilePath;
                    }
                } catch (error) {
                    console.error("Failed to create temporary file:", error);
                    return;
                }
            }
        } else {
            pandocSourceFilePath = this.composeAbsolutePath(pandocSourceFilePath);
        }

        const commandArgs = this.composeArgs(pandocSourceFilePath, configArgs);
        const formattedCommand = `${commandPath} ${commandArgs.join(" ")}`;
        const outputAbsolutePath = configArgs.outputAbsolutePath;
        const modal = new OutputModal(
            app,
            formattedCommand,
            configArgs.outputSubpath,
            this.isAutoOpenOutput,
            this.isAutoClose
        );

        try {
            modal.open();
            await ensureParentDirectoryExists(this.app, this.outputSubpath);

            const process = spawn(commandPath, commandArgs, { cwd: tmpdir() });
            modal.setMessage("Starting production run");
            modal.registerStartedProcess();

            process.stdout?.on('data', (data) => {
                modal.appendOutput(data);
            });

            process.stderr?.on('data', (data) => {
                modal.appendError(data);
            });

            process.on('close', async (code) => {
                if (code === 0) {
                    modal.setMessage(`Document successfully produced: '${outputAbsolutePath}'`);
                    if (tempFilePath !== null && tempFilePath) {
                        try {
                            await unlink(tempFilePath);
                        } catch (err) {
                            console.error("Failed to delete temporary file:", tempFilePath, err);
                        }
                    }
                } else {
                    modal.setMessage(`Document production failed with code: ${code}`);
                    if (tempFilePath !== null && tempFilePath) {
                        console.error("Temporary file retained:", tempFilePath);
                    }
                }
                modal.registerClosedProcess();
            });
        } catch (err) {
            modal.appendMessage(`Failed to produce document: ${err}`);
            if (tempFilePath !== null && tempFilePath) {
                console.error("Temporary file retained:", tempFilePath);
            }
        }
    }




}

class Producer {
    private activeFile: TFile;
    private vaultRootPath: string;
    private pluginResourcePath: string;
    private settings: ImpresarioSettings;

    constructor(
        activeFile: TFile,
        settings: ImpresarioSettings,
    ) {
        this.activeFile = activeFile;
        this.vaultRootPath = this.getVaultBasePath();
        this.pluginResourcePath = path.join(
            this.vaultRootPath,
            '.obsidian',
            'plugins',
            'obsidian-impresario',
            'resources'
        );
        this.settings = settings;
    }

    getVaultBasePath(): string {
        const adapter = app.vault.adapter;
        if (adapter instanceof FileSystemAdapter) {
            return adapter.getBasePath();
        }
        return "";
    }

    produce(
        isOpenSetupModal: boolean,
        isAutoOpenOutput: boolean,
        isSplitBibliography: boolean,
        isVerboseRun: boolean,
    ) {
        if (!this.activeFile.path.endsWith(".md")) {
            new Notice("Cannot produce active file: not in Markdown format");
            return;
        }
        let isAutoClose = isOpenSetupModal ? false : true;
        const productionSetupModal = new ProductionSetupModal(
            app,
            this.activeFile,
            isAutoOpenOutput,
            isAutoClose,
            this.settings,
        );
        if (isOpenSetupModal) {
            productionSetupModal.open();
        } else {
            productionSetupModal.backgroundRun(isSplitBibliography, isVerboseRun);
        }
    }
}

class OutputModal extends Modal {
    commandEl: HTMLElement;
    destinationEl: HTMLElement;
    messageEl: HTMLElement;
    outputEl: HTMLElement;
    errorEl: HTMLElement;
    copyCommandBtn: HTMLButtonElement;
    copyDestinationBtn: HTMLButtonElement;
    closeBtn: HTMLButtonElement;
    copyOutputBtn: HTMLButtonElement;
    openDestination: HTMLButtonElement;
    outputSubpath: string;
    isAutoOpenOutput: boolean;
    isAutoClose: boolean;

    constructor(
        app: App,
        command: string,
        outputSubpath: string,
        isAutoOpenOutput: boolean,
        isAutoClose: boolean,
    ) {
        super(app);

        this.outputSubpath = outputSubpath;
        this.isAutoOpenOutput = isAutoOpenOutput;
        this.isAutoClose = isAutoClose;

        this.contentEl.createEl('h3', { text: 'Command' });
        this.commandEl = this.contentEl.createEl('div', { cls: ["console-display-inner"] });
        this.commandEl.setText(command);

        this.copyCommandBtn = this.contentEl.createEl('button', { text: 'Copy Command' });
        this.copyCommandBtn.onclick = () => this.copyToClipboard(command);

        this.contentEl.createEl('h3', { text: 'Status' });
        this.messageEl = this.contentEl.createEl('div', { cls: ["console-display-inner"] });
        this.messageEl.setText("Running production ...");

        this.contentEl.createEl('h3', { text: 'Pandoc' });
        this.errorEl = this.contentEl.createEl('div', { cls: ["console-display-inner"] });

        this.contentEl.createEl('h3', { text: 'Destination' });
        this.destinationEl = this.contentEl.createEl(
            'div',
            { cls: ["console-display-inner"] }
        );
        this.destinationEl.style.height = "6rem";
        this.destinationEl.setText(outputSubpath);
        this.copyDestinationBtn = this.contentEl.createEl('button', { text: 'Copy Path' });
        this.copyDestinationBtn.onclick = () => this.copyToClipboard(outputSubpath);

        this.openDestination = this.contentEl.createEl('button', { text: 'Open' });
        this.openDestination.setAttribute('disabled', 'true'); // Disable done button initially
        this.openDestination.onclick = () => {
            this.app.workspace.openLinkText(outputSubpath, '', "split");
        };

        this.closeBtn = this.contentEl.createEl('button', { text: 'Close' });
        this.closeBtn.onclick = () => this.close();
    }

    setMessage(text: string) {
        this.messageEl.empty();
        const rowEl = this.messageEl.createEl('div', { cls: ["console-display-inner-row"] });
        rowEl.setText(text);
    }
    appendMessage(text: string) {
        const rowEl = this.messageEl.createEl('div', { cls: ["console-display-inner-row"] });
        rowEl.setText(text);
    }

    appendOutput(text: string) {
        const rowEl = this.outputEl.createEl('div', { cls: ["console-display-inner-row"] });
        rowEl.setText(text);
    }

    appendError(text: string) {
        const currentText = this.errorEl.getText();
        this.errorEl.setText(`${currentText}\n${text}`);
    }

    registerStartedProcess() {
        this.messageEl.classList.add("process-is-running");
        this.messageEl.classList.remove("process-is-closed");
    }

    registerClosedProcess() {
        this.messageEl.classList.remove("process-is-running");
        this.messageEl.classList.add("process-is-closed");
        this.openDestination.removeAttribute('disabled');
        if (this.isAutoOpenOutput) {
            this.app.workspace.openLinkText(this.outputSubpath, '', "split");
        }
        if (this.isAutoClose) {
            this.close();
        }
    }

    private copyToClipboard(text: string) {
        navigator.clipboard.writeText(text).then(() => {
            new Notice('Text copied to clipboard!');
        }, (err) => {
            console.error('Failed to copy text: ', err);
            new Notice('Failed to copy text.');
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export default class Impresario extends Plugin {
    settings: ImpresarioSettings;

    produceActiveFile(
        isOpenSetupModal: boolean,
        isAutoOpenOutput: boolean,
        isSplitBibliography: boolean,
        isVerboseRun: boolean,
    ) {
        if (!this.app.workspace) {
            return;
        }
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('No active file found.');
            return;
        }
        const producer = new Producer(
            activeFile,
            this.settings,
        );
        producer.produce(
            isOpenSetupModal,
            isAutoOpenOutput,
            isSplitBibliography,
            isVerboseRun,
        );
    }

    async onload() {
        await this.loadSettings();

        this.addRibbonIcon("theater", "Produce!", () => {
            this.produceActiveFile(true, false, false, false);
        });
        this.addCommand({
            id: 'impresario-produce-default',
            name: 'Produce the active file',
            callback: () => this.produceActiveFile(false, true, false, false), // arrow function for lexical closure
        });
        this.addCommand({
            id: 'impresario-produce-default-background',
            name: 'Produce the active file in the background',
            callback: () => this.produceActiveFile(false, false, false, false), // arrow function for lexical closure
        });
        this.addCommand({
            id: 'impresario-produce-default-background-split-bibliography',
            name: 'Produce the active file in the background with separate bibliography',
            callback: () => this.produceActiveFile(false, false, true, false), // arrow function for lexical closure
        });
        this.addCommand({
            id: 'impresario-produce-setup',
            name: 'Set up a production run for the active file',
            callback: () => this.produceActiveFile(true, false, false, false), // arrow function for lexical closure
        });
        this.addSettingTab(new ImpresarioSettingTab(this.app, this));
    }

    onunload() {
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    displayFrontmatter(file: TFile) {
        const cache = this.app.metadataCache.getFileCache(file);
        if (cache && cache.frontmatter) {
            console.log("Frontmatter Metadata:", cache.frontmatter);
        } else {
            console.log("No frontmatter found in the file.");
        }
    }
}

class ImpresarioSettingTab extends PluginSettingTab {
    plugin: Impresario;

    constructor(app: App, plugin: Impresario) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
    }
}

async function ensureDirectoryExists(app: App, dirPath: string): Promise<void> {
    let dirNode = app.vault.getAbstractFileByPath(dirPath) as TFolder;
    if (!dirNode) {
        await app.vault.createFolder(dirPath);
    }
}

export async function ensureParentDirectoryExists(app: App, filePath: string): Promise<void> {
    const parentDirPath = filePath.substring(0, filePath.lastIndexOf('/'));
    let parentDir = app.vault.getAbstractFileByPath(parentDirPath) as TFolder;

    if (!parentDir) {
        await createDirectory(app, parentDirPath);
    }
}

export async function createDirectory(app: App, dirPath: string): Promise<TFolder> {
    const pathParts = dirPath.split('/').filter(part => part.length);

    let currentPath = '';
    let currentDir: TAbstractFile | null = null;

    for (const part of pathParts) {
        currentPath += '/' + part;
        currentDir = app.vault.getAbstractFileByPath(currentPath);

        if (!currentDir) {
            currentDir = await app.vault.createFolder(currentPath);
        }
    }

    return currentDir as TFolder;
}
