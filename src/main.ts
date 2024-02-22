// To compile:
// $ npm i
// $ npm run build

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
// import * as child_process from 'child_process'
import { spawn, exec } from "child_process";
import * as path from "path";
import * as os from 'os';

// Custom View
// https://docs.obsidian.md/Plugins/User+interface/Views
// import { ImpresarioNavigatorView, VIEW_TYPE_APEXNAVIGATOR } from "./view";

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
    // }}}

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
        // return this.readDefaultString("production-output-format", "beamer")
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
            () => "artifacts",
        )
        return rval;
        // return this.resolveArgumentValue(
        //     configArgs,
        //     "defaultBibliographyPath",
        //     "bibliographic-database-path",
        //     "bibliographyPath",
        //     () => "",
        // );
    }

    defaultSlideLevel(): string {
        return this.readPropertyString(
            "production-slide-level",
            // this.composeAbsolutePath(this.sourceFileSubdirectory)
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

        // contentEl.createEl("h3", { text: "Production Parameters" });
        // contentEl.createEl("h4", { text: "Slide Level" });
        // const slideLevelContainer: HTMLElement = contentEl.createEl("div", {"cls": "impresario-modal-input-container"})
        // const slideLevelInput = slideLevelContainer.createEl('input', {
        //     type: 'number',
        //     cls: ["impresario-modal-input-element"]
        // });
        // slideLevelInput.value = this.defaultSlideLevel()
        // slideLevelInput.setAttribute('min', '0'); // Set 'min' attribute separately

        contentEl.createEl("br")
        contentEl.createEl("br")
        const finalButtonsContainer = new Setting(contentEl)
        let isVerbose = false;
        finalButtonsContainer.controlEl.appendChild(document.createTextNode("Verbose"));
        const verbosityToggle = finalButtonsContainer.addToggle( toggle => {
            toggle.setValue(isVerbose)
                .onChange(async (value) => {
                    isVerbose = value;
                })
        })
        finalButtonsContainer.addButton( (button: ButtonComponent) => {
            button
                .setButtonText("Produce!")
                .onClick( () => {
                    // ensureDirectoryExists(this.app, this.outputAbsolutePath);
                    this.execute(
                        "pandoc",
                        {
                            outputFormat: formatDropdown.value,
                            outputSubpath: this.outputSubpath,
                            outputAbsolutePath: this.outputAbsolutePath,
                            // slideLevel: slideLevelInput.value,
                            verbosity: isVerbose ? "true" : "",
                        },
                    );
                    this.close();
                });
        });
    }

    backgroundRun(
        isVerbose: boolean = false,
    ) {
        let outputFormat = this.defaultOutputFormat();
        let outputDirectory = this.defaultOutputDirectory();
        // let slideLevel = this.defaultSlideLevel();
        this.outputSubpath = this.composeOutputSubpath(
            outputFormat || "",
            outputDirectory || "",  // Changed from textContent to value
        )
        this.execute(
            "pandoc",
            {
                outputFormat: outputFormat,
                outputSubpath: this.outputSubpath,
                outputAbsolutePath: this.composeAbsolutePath(this.outputSubpath),
                // slideLevel: this.defaultSlideLevel(),
                verbosity: isVerbose ? "true" : "",
            },
        );
    }
    composeResourcePath(...subpaths: string[]): string {
        return path.join(
            this.vaultRootPath,
            ".obsidian",
            "plugins",
            "obsidian-impresario",
            "resources",
            // "publication",
            ... subpaths,
        )
    }

    resolveArgumentValue(
        configArgs: { [key:string]: string },
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

    composeArgs(
        configArgs: { [key:string]: string }
    ): string[] {
        const outputAbsolutePath = configArgs.outputAbsolutePath
        const fromElements = [
            // "markdown_strict",
            "markdown",
            // "mediawiki_links",
            "wikilinks_title_after_pipe",
            "pipe_tables",
            "backtick_code_blocks",
            "auto_identifiers",
            "strikeout",
            "yaml_metadata_block",
            "implicit_figures",
            "smart",
            "fenced_divs",
            "citations",
            "link_attributes",
        ]
        const args = [
            "--from", fromElements.join("+"),
            "--standalone",
            // "-t", configArgs.outputFormat,
            "-t", configArgs.outputFormat,
            "--resource-path", this.vaultRootPath,
            this.sourceFileAbsolutePath,
            "-o", outputAbsolutePath,
        ];
        if (true) {
            args.push(... [
                "--lua-filter", this.composeResourcePath(
                    "publication",
                    "pandoc",
                    "filters",
                    "imageAttrs.lua"
                )]);
            args.push(... [
                "--lua-filter", this.composeResourcePath(
                    "publication",
                    "pandoc",
                    "filters",
                    "scratch.lua"
                )]);
            args.push(... [
                "--lua-filter", this.composeResourcePath(
                    "publication",
                    "pandoc",
                    "filters",
                    "citationlinks.lua"
                )]);
            args.push(... [
                "--lua-filter", this.composeResourcePath(
                    "publication",
                    "pandoc",
                    "filters",
                    "tikzblock.lua"
                )]);
        }
        // if (false) {
        //     args.push(... [
        //         "--filter", this.composeResourcePath(
        //             "publication",
        //             "pandoc",
        //             "filters",
        //             "boxes.py"
        //         )]);
        // }
        if (configArgs.isVerbose) {
            args.push("--verbose");
        }
        const extractPath = (item: string) => item?.trim().replace(/^\[\[/g, "").replace(/\]\]$/g,"");
        if (true) {
            args.push("--citeproc")
            const bibliographyDataPaths: string[] = []
            let customBibPath = this.resolveArgumentValue(
                configArgs,
                "defaultBibliographyPath",
                "bibliographic-database-path",
                "bibliographyPath",
                () => "",
            );
            if (customBibPath) {
                bibliographyDataPaths.push(extractPath(customBibPath));
            }
            bibliographyDataPaths.push(
                ... this.readPropertyList("bibliography")
                    .map(extractPath)
            // .map( (filePath: string) => path.join(this.vaultRootPath, filePath))
            )
            bibliographyDataPaths.forEach( (bdPath) => args.push(... ["--bibliography", bdPath]) )
            args.push( ... this.readPropertyList("resource-path").map(extractPath) );
            args.push( ... this.readPropertyList("resource-paths").map(extractPath) );
        }
        // args.push("--shift-heading-level-by");
        // args.push(this.resolveArgumentValue(
        //     configArgs,
        //     "shiftHeadingLevelBy",
        //     "shift-heading-level-by",
        //     "shiftHeadingLevelBy",
        //     () => "0",
        // ));
        if (true) {
            // https://github.com/raghur/mermaid-filter
            // npm i -g mermaid-filter
            // Note that pandoc-crossref will automatically find and use the
            // caption= option. Also note that the order of applying the
            // filters matters - you must apply mermaid-filter before
            // pandoc-crossref so that pandoc-crossref can find the images.)
            args.push(... [
                "--filter", "mermaid-filter",
            ])
        }
        if (true) {
            // come after citations are processed
            args.push(... [
                "--lua-filter", this.composeResourcePath(
                    "publication",
                    "pandoc",
                    "filters",
                    "callouts.lua"
                )]);
            args.push(... [
                "--lua-filter", this.composeResourcePath(
                    "publication",
                    "pandoc",
                    "filters",
                    "boxes.lua"
                )]);
        }
        if (configArgs.outputFormat === "pdf" || configArgs.outputFormat === "beamer") {
            args.push( ... [
            "-H", this.composeResourcePath(
                "publication",
                "pandoc",
                "templates",
                "packages.latex",
            )]);
        }
        // if (configArgs.outputFormat === "pdf") {
        //     args.push(... [
        //         "--template", this.composeResourcePath(
        //             "publication",
        //             "pandoc",
        //             "templates",
        //             // "default_mod.latex",
        //             "pdfdefault.tex",
        //         ),
        //     ])
        // }
        if (configArgs.outputFormat === "beamer") {
            let slideLevel = this.resolveArgumentValue(
                configArgs,
                "defaultSlideLevel",
                "slide-level",
                "slideLevel",
                () => "2",
            );
            args.push(... [
                "--slide-level",
                slideLevel,
            ])
            // credit: git@github.com:alexeygumirov/pandoc-beamer-how-to.git
            // Alexey Gumirov <ag_devops@die-optimisten.net>
            args.push(... [
                "-H", this.composeResourcePath(
                    "publication",
                    "pandoc",
                    "templates",
                    "beamer-preamble.tex"
                ),
                // "--template", this.composeResourcePath(
                //     "publication",
                //     "pandoc",
                //     "templates",
                //     // "default_mod.latex",
                //     "beamer-template.tex",
                // ),
            ])
        }
        return args
    }

    execute(
        commandPath: string,
        configArgs: { [key:string]: string }
    ) {
        const commandArgs = this.composeArgs(configArgs)
        const formattedCommand = commandPath + " " + commandArgs.join(" ")
        const outputAbsolutePath = configArgs.outputAbsolutePath
        const modal = new OutputModal(
            app,
            formattedCommand,
            configArgs.outputSubpath,
            this.isAutoOpenOutput,
            this.isAutoClose,
        );
        modal.open();
        try {
            ensureParentDirectoryExists(this.app, this.outputSubpath)
                .then( () => {
                    const process = spawn(
                        commandPath,
                        commandArgs,
                        // { cwd: this.vaultRootPath },
                        { cwd: os.tmpdir() },
                    );
                    // const process = exec(commandPath + " " + commandArgs.join(" "), { cwd: this.vaultRootPath });
                    // const process = exec("ls" + " " + commandArgs.join(" "), { cwd: this.vaultRootPath });
                    // const process = exec("echo $PATH")
                    modal.setMessage("Starting production run")
                    modal.registerStartedProcess()
                    process.stdout?.on('data', (data) => {
                        // console.log(data)
                        modal.appendOutput(data);
                    });
                    process.stderr?.on('data', (data) => {
                        // console.log(data)
                        modal.appendError(data);
                    });
                    process.on('close', (code) => {
                        if (code === 0) {
                            modal.setMessage(`Document successfully produced: '${outputAbsolutePath}'`);
                        } else {
                            modal.setMessage(`Document production failed with code: ${code}`);
                        }
                        modal.registerClosedProcess()
                    });
                })
                .catch();
        } catch (err) {
            modal.appendMessage(`Failed to produce document: ${err}`);
            // setTimeout(() => modal.close(), 2000); // Close the modal after 2 seconds
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
        this.activeFile = activeFile
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

    // getProductionOutputFormat(): string {
    //     const cache = app.metadataCache.getFileCache(this.activeFile);
    //     return cache
    //         && cache.frontmatter
    //         && (
    //             cache.frontmatter['production-output-format']
    //             || cache.frontmatter["output-format"]
    //             || "pdf"
    //         )
    // }

    produce(
        isOpenSetupModal: boolean,
        isAutoOpenOutput: boolean,
        isVerboseRun: boolean,
    ) {
        if (!this.activeFile.path.endsWith(".md")) {
            new Notice("Cannot produce active file: not in Markdown format")
            return
        }
        let isAutoClose = isOpenSetupModal ?  false : true;
        const productionSetupModal = new ProductionSetupModal(
            app,
            this.activeFile,
            isAutoOpenOutput,
            isAutoClose,
            this.settings,
        )
        if (isOpenSetupModal) {
            productionSetupModal.open();
        } else {
            productionSetupModal.backgroundRun(isVerboseRun);
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

        // Command Section
        this.contentEl.createEl('h3', { text: 'Command' });
        this.commandEl = this.contentEl.createEl('div', {cls: ["console-display-inner"]});
        this.commandEl.setText(command);

        // Button to copy command
        this.copyCommandBtn = this.contentEl.createEl('button', { text: 'Copy Command' });
        this.copyCommandBtn.onclick = () => this.copyToClipboard(command);

        // Button to copy command
        // this.copyCommandBtn = this.contentEl.createEl('button', { text: 'Copy Command' });
        // this.copyCommandBtn.onclick = () => this.copyToClipboard(command);

        // Message Section
        this.contentEl.createEl('h3', { text: 'Status' });
        this.messageEl = this.contentEl.createEl('div', {cls: ["console-display-inner"]});
        this.messageEl.setText("Running production ...");

        // Output Section
        // this.contentEl.createEl('h3', { text: 'Output' });
        // this.outputEl = this.contentEl.createEl('div', {cls: ["console-display-inner"]});

        // Error Section
        this.contentEl.createEl('h3', { text: 'Pandoc' });
        this.errorEl = this.contentEl.createEl('div', {cls: ["console-display-inner"]});

        // Result Section
        this.contentEl.createEl('h3', { text: 'Destination' });
        this.destinationEl = this.contentEl.createEl(
            'div',
            {cls: ["console-display-inner"]}
        );
        this.destinationEl.style.height = "6rem";
        this.destinationEl.setText(outputSubpath);
        this.copyDestinationBtn = this.contentEl.createEl('button', { text: 'Copy Path' });
        this.copyDestinationBtn.onclick = () => this.copyToClipboard(outputSubpath);


        // Button to copy output
        // this.copyOutputBtn = this.contentEl.createEl('button', { text: 'Copy Output' });
        // this.copyOutputBtn.setAttribute('disabled', 'true'); // Disable button initially
        // this.copyOutputBtn.onclick = () => this.copyToClipboard(this.outputEl.getText());

        // Open Button
        this.openDestination = this.contentEl.createEl('button', { text: 'Open' });
        this.openDestination.setAttribute('disabled', 'true'); // Disable done button initially
        this.openDestination.onclick = () => {
            this.app.workspace.openLinkText(outputSubpath, '', "split")
        };

        // Close (Process continues running in background!)
        this.closeBtn = this.contentEl.createEl('button', { text: 'Close' });
        this.closeBtn.onclick = () => this.close();

    }

    // appendOutput(text: string) {
    //     // let currentText = this.outputEl.getText();
    //     // this.outputEl.setText(`${currentText}\n${text}`);
    //     const rowEl = this.outputEl.createEl('div', {cls: ["console-display-inner-row"]});
    //     rowEl.setText(text)
    //     this.copyOutputBtn.removeAttribute('disabled'); // Enable copy button after appending output
    //     this.closeBtn.removeAttribute('disabled'); // Enable close button after appending output
    // }

    setMessage(text: string) {
        this.messageEl.empty()
        const rowEl = this.messageEl.createEl('div', {cls: ["console-display-inner-row"]});
        rowEl.setText(text)
        // this.closeBtn.removeAttribute('disabled'); // Enable close button after appending message
    }
    appendMessage(text: string) {
        // let currentText = this.messageEl.getText();
        // this.messageEl.setText(`${currentText}\n${text}`);
        const rowEl = this.messageEl.createEl('div', {cls: ["console-display-inner-row"]});
        rowEl.setText(text)
        // this.copyMessageBtn.removeAttribute('disabled'); // Enable copy button after appending message
        // this.closeBtn.removeAttribute('disabled'); // Enable close button after appending message
    }

    appendOutput(text: string) {
        // let currentText = this.outputEl.getText();
        // this.outputEl.setText(`${currentText}\n${text}`);
        const rowEl = this.outputEl.createEl('div', {cls: ["console-display-inner-row"]});
        rowEl.setText(text)
        // this.copyOutputBtn.removeAttribute('disabled'); // Enable copy button after appending output
        // this.closeBtn.removeAttribute('disabled'); // Enable close button after appending output
    }

    appendError(text: string) {
        const currentText = this.errorEl.getText();
        this.errorEl.setText(`${currentText}\n${text}`);

        // const rowEl = this.errorEl.createEl('div', {cls: ["console-display-inner-row"]});
        // rowEl.setText(text)

        // this.copyErrorBtn.removeAttribute('disabled'); // Enable copy button after appending error
        // this.closeBtn.removeAttribute('disabled'); // Enable close button after appending error
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
            isVerboseRun,
        );
    }

    async onload() {
        await this.loadSettings();

        // this.addRibbonIcon("factory", "Produce!", () => {
        // this.addRibbonIcon("blocks", "Produce!", () => {
        this.addRibbonIcon("theater", "Produce!", () => {
            this.produceActiveFile(true, false, false);
        });
        this.addCommand({
            id: 'impresario-produce-default',
            name: 'Produce the active file',
            // callback: this.produceActiveFile,
            callback: () => this.produceActiveFile(false, true, false), // arrow function for lexical closure
        });
        this.addCommand({
            id: 'impresario-produce-default-background',
            name: 'Produce the active file in the background',
            // callback: this.produceActiveFile,
            callback: () => this.produceActiveFile(false, false, false), // arrow function for lexical closure
        });
        this.addCommand({
            id: 'impresario-produce-setup',
            name: 'Set up a production run for the active file',
            // callback: this.produceActiveFile,
            callback: () => this.produceActiveFile(true, false, false), // arrow function for lexical closure
        });
        this.addSettingTab(new ImpresarioSettingTab(this.app, this));
    }


    onunload() {
    // clear existing leaves
    // disabled for development
    // this.app.workspace.detachLeavesOfType(VIEW_TYPE_APEXNAVIGATOR)
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
        const {containerEl} = this;
        containerEl.empty();
    }
}

async function ensureDirectoryExists(app: App, dirPath: string): Promise<void> {
    // Check if the parent directory exists

    let dirNode = app.vault.getAbstractFileByPath(dirPath) as TFolder;
    if (!dirNode) {
        // Create the parent directory if it doesn't exist
        await app.vault.createFolder(dirPath);
    }
}

export async function ensureParentDirectoryExists(app: App, filePath: string): Promise<void> {
    const parentDirPath = filePath.substring(0, filePath.lastIndexOf('/'));

    // Check if the parent directory exists
    let parentDir = app.vault.getAbstractFileByPath(parentDirPath) as TFolder;

    if (!parentDir) {
        // Create the parent directory if it doesn't exist
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
            // Create the directory if it doesn't exist
            currentDir = await app.vault.createFolder(currentPath);
        }
    }

    return currentDir as TFolder;
}
