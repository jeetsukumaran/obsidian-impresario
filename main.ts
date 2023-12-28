// To compile:
// $ npm i
// $ npm run build

import {
	App,
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
} from 'obsidian';
// import * as child_process from 'child_process'
import { spawn, exec } from "child_process"
import * as path from "path"

// Custom View
// https://docs.obsidian.md/Plugins/User+interface/Views
// import { ImpresarioNavigatorView, VIEW_TYPE_APEXNAVIGATOR } from "./view";

interface ImpresarioSettings {
	artifactsLocation: string;
}

const DEFAULT_SETTINGS: ImpresarioSettings = {
	// artifactsLocation: "artifacts";
	// current directory
	artifactsLocation: ".",
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
	label: string = "Parameter"
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

    constructor(
		app: App,
		sourceFile: TFile,
    ) {
        super(app);
		this.refreshSourceData(sourceFile)
		// this.vaultRootPath = this.sourceFile.vault.adapter.basePath
		// console.log(this.sourceFile)
    }

    refreshSourceData(sourceFile: TFile) {
        this.sourceFile = sourceFile
        this.sourceFilePath = sourceFile.path
		this.vaultRootPath = this.getVaultBasePath();
		this.sourceFileSubdirectory = sourceFile.parent?.path || ""
		this.metadataCache = this.app.metadataCache.getFileCache(this.sourceFile) || {}
    }

	getVaultBasePath(): string {
		let adapter = app.vault.adapter;
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
		let propertyValue = this.metadataCache?.frontmatter?.[key] || ""
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
		let propertyValue = this.metadataCache?.frontmatter?.[key] || ""
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
    	return this.readPropertyString("production-output-format", "pdf")
    }

    defaultOutputDirectory(): string {
    	return this.readPropertyString(
			"production-output-directory",
			// this.composeAbsolutePath(this.sourceFileSubdirectory)
			this.sourceFileSubdirectory,
    	)
    }

    defaultSlideLevel(): string {
    	return this.readPropertyString(
			"production-slide-level",
			// this.composeAbsolutePath(this.sourceFileSubdirectory)
			"2",
    	)
    }

	onOpen() {
		let { contentEl } = this;
		contentEl.createEl('h2', { text: 'Production Setup' });

		contentEl.createEl("h3", { text: "Parameters" });
		contentEl.createEl("h4", { text: "Slide Level" });

		const slideLevelContainer: HTMLElement = contentEl.createEl("div", {"cls": "impresario-modal-input-container"})
		// let slideLevelInput = slideLevelContainer.createEl('input', { type: 'number', value: this.defaultSlideLevel(), cls: ["impresario-modal-input-element"] });
		let slideLevelInput = slideLevelContainer.createEl('input', {
			type: 'number',
			cls: ["impresario-modal-input-element"]
		});
		slideLevelInput.value = this.defaultSlideLevel()
		slideLevelInput.setAttribute('min', '0'); // Set 'min' attribute separately

		contentEl.createEl("h3", { text: "Output" });
		contentEl.createEl("h4", { text: "Output Format" });

		const outputFormatContainer: HTMLElement = contentEl.createEl("div", {cls: "impresario-modal-input-container"})
		let formatDropdown = outputFormatContainer.createEl('select', {cls: ["impresario-modal-input-element"]});

		Object.entries(this.outputFormatMap).forEach(([formatName, formatExtension]) => {
			let option = formatDropdown.createEl('option', { text: formatName, value: formatName });
			if (formatName === this.defaultOutputFormat()) {
				option.selected = true;
			}
		});

		contentEl.createEl("h4", { text: "Output Directory" });
		const outputDirectoryInputContainer: HTMLElement = contentEl.createEl("div", {cls: "impresario-modal-input-container"})

		let outputDirectoryInput = outputDirectoryInputContainer.createEl('textarea', {
			cls: ["impresario-modal-input-element"],
		});
		outputDirectoryInput.textContent = this.defaultOutputDirectory()

		contentEl.createEl("h4", { text: "Output Path" });
		let outputAnnotationContainer = contentEl.createEl('div', {
			cls: ["impresario-modal-annotation"],
		});

		const updateAnnotation = () => {
			this.outputSubpath = this.composeOutputSubpath(
				formatDropdown.value || "",
				outputDirectoryInput.value || "",  // Changed from textContent to value
			)
			this.outputAbsolutePath = this.composeAbsolutePath(this.outputSubpath)
			outputAnnotationContainer.setText(this.outputAbsolutePath)
		};

		formatDropdown.addEventListener('change', updateAnnotation);
		outputDirectoryInput.addEventListener('input', updateAnnotation);


		updateAnnotation(); // Initial update

		const finalButtonsContainer = contentEl.createEl("div", { cls: ["impresario-modal-final-buttons-container"] });
		const runButton = finalButtonsContainer.createEl('button', {
			text: 'Run',
			type: 'button'
		}).addEventListener('click', () => {
			this.execute(
				"pandoc",
				{
					outputFormat: formatDropdown.value,
					outputSubpath: this.outputSubpath,
					outputAbsolutePath: this.outputAbsolutePath,
					slideLevel: slideLevelInput.value,
				},
			);
			this.close();
		});
	}

	composeResourcePath(...subpaths: string[]): string {
		return path.join(
			this.vaultRootPath,
			".obsidian",
			"plugins",
			"obsidian-impresario",
			"resources",
			"publication",
			... subpaths,
		)
	}

	composeArgs(
		configArgs: { [key:string]: string }
	): string[] {
		let outputAbsolutePath = configArgs.outputAbsolutePath
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
			"-t", configArgs.outputFormat,
			"--resource-path", this.vaultRootPath,
			this.sourceFileAbsolutePath,
			"-o", outputAbsolutePath,
			"--lua-filter", this.composeResourcePath("pandoc", "filters", "pdcites.lua"),
			// "--verbose",
		];
		if (configArgs.outputFormat === "beamer") {
			args.push(... [
				"--slide-level", configArgs["slideLevel"] || "2",
			])
			// credit: git@github.com:alexeygumirov/pandoc-beamer-how-to.git
			// Alexey Gumirov <ag_devops@die-optimisten.net>
			args.push(... [
				"-H", this.composeResourcePath(
					"pandoc",
					"templates",
					"beamer-preamble.tex"
				),
				"--template", this.composeResourcePath(
					this.vaultRootPath,
					"pandoc",
					"templates",
					"default_mod.latex",
				),
			])
		}
		if (true) {
			args.push("--citeproc")
			let bibliographyDataPaths: string[] = []
			bibliographyDataPaths.push(
				... this.readPropertyList("production-reference-data")
					.map( (item: string) => item?.replace(/^\[\[/g, "").replace(/\]\]$/g,"") )
			)
			bibliographyDataPaths.forEach( (bdPath) => args.push(... ["--bibliography", bdPath]) )
		}
		return args
	}

	execute(
		commandPath: string,
		configArgs: { [key:string]: string }
	) {
		const commandArgs = this.composeArgs(configArgs)
		const formattedCommand = commandPath + " " + commandArgs.join(" ")
		let outputAbsolutePath = configArgs.outputAbsolutePath
		const modal = new OutputModal(
			app,
			formattedCommand,
			configArgs.outputSubpath,
		);
		modal.open();
		try {
			const process = spawn(commandPath, commandArgs, { cwd: this.vaultRootPath });
			// const process = exec(commandPath + " " + commandArgs.join(" "), { cwd: this.vaultRootPath });
			// const process = exec("ls" + " " + commandArgs.join(" "), { cwd: this.vaultRootPath });
			// const process = exec("echo $PATH")
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
					modal.appendMessage(`Document successfully produced: '${outputAbsolutePath}'`);
				} else {
					modal.appendMessage(`Document production failed with code: ${code}`);
				}
				modal.registerClosedProcess()
			});
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

    constructor(
		activeFile: TFile,
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
    }

	getVaultBasePath(): string {
		let adapter = app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) {
			return adapter.getBasePath();
		}
		return "";
	}

	getProductionOutputFormat(): string {
        const cache = app.metadataCache.getFileCache(this.activeFile);
        return cache && cache.frontmatter && cache.frontmatter['production-output-format']
               ? cache.frontmatter['production-output-format']
               : 'beamer'; // Default to 'beamer' if not specified
    }

    produce() {
		let outputFormat: string = this.getProductionOutputFormat();
        let defaultSlideLevel: number = 2; // Default value
        let defaultOutputPath: string = 'path/to/default/output'; // Default value
		const productionSetupModal = new ProductionSetupModal(app, this.activeFile)
		productionSetupModal.open();
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
    doneBtn: HTMLButtonElement;

    constructor(
		app: App,
		command: string,
		outputSubpath: string,
    ) {
        super(app);

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
        this.contentEl.createEl('h3', { text: 'Message' });
        this.messageEl = this.contentEl.createEl('div', {cls: ["console-display-inner"]});
        this.messageEl.setText("(Running Production)");

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

        // Done Button
        this.doneBtn = this.contentEl.createEl('button', { text: 'Done' });
        this.doneBtn.setAttribute('disabled', 'true'); // Disable done button initially
        this.doneBtn.onclick = () => this.close();

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

    appendMessage(text: string) {
        // let currentText = this.messageEl.getText();
        // this.messageEl.setText(`${currentText}\n${text}`);
        const rowEl = this.messageEl.createEl('div', {cls: ["console-display-inner-row"]});
        rowEl.setText(text)
        // this.copyMessageBtn.removeAttribute('disabled'); // Enable copy button after appending message
        this.closeBtn.removeAttribute('disabled'); // Enable close button after appending message
    }

    appendOutput(text: string) {
        // let currentText = this.outputEl.getText();
        // this.outputEl.setText(`${currentText}\n${text}`);
        const rowEl = this.outputEl.createEl('div', {cls: ["console-display-inner-row"]});
        rowEl.setText(text)
        // this.copyOutputBtn.removeAttribute('disabled'); // Enable copy button after appending output
        this.closeBtn.removeAttribute('disabled'); // Enable close button after appending output
    }

    appendError(text: string) {
        // let currentText = this.errorEl.getText();
        // this.errorEl.setText(`${currentText}\n${text}`);
        const rowEl = this.errorEl.createEl('div', {cls: ["console-display-inner-row"]});
        rowEl.setText(text)
        // this.copyErrorBtn.removeAttribute('disabled'); // Enable copy button after appending error
        this.closeBtn.removeAttribute('disabled'); // Enable close button after appending error
    }


    registerStartedProcess() {
    	this.messageEl.classList.add("process-is-running")
    	this.messageEl.classList.remove("process-is-closed")
    }

    registerClosedProcess() {
    	this.messageEl.classList.remove("process-is-running")
    	this.messageEl.classList.add("process-is-closed")
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
        let { contentEl } = this;
        contentEl.empty();
    }
}




export default class Impresario extends Plugin {
	settings: ImpresarioSettings;


	produceActiveFile() {
		if (!this.app.workspace) {
			return;
		}
		let activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active file found.');
			return;
		}
		const producer = new Producer(activeFile)
		producer.produce()
	}

	async onload() {
		await this.loadSettings();

		// this.addRibbonIcon("factory", "Produce!", () => {
		// this.addRibbonIcon("blocks", "Produce!", () => {
		this.addRibbonIcon("theater", "Produce!", () => {
			this.produceActiveFile();
		});
		this.addCommand({
			id: 'impresario-produce-document',
			name: 'Produce the active file',
			callback: this.produceActiveFile,
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

