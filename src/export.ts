import { Modal, Setting, TFile, App, Notice } from 'obsidian';

import PDFPlus from 'main';
import { PDFPlusAPI } from 'api';


export class ExportModal extends Modal {
    addObsidianURI: boolean;
    exportPath: string | null;

    constructor(public plugin: PDFPlus, public file: TFile) {
        super(plugin.app);
        this.addObsidianURI = false;
        this.exportPath = null;
    }

    onOpen() {
        this.titleEl.setText('Export backlink highlights');

        this.addSetting()
            .setName('Export highlights with Obsidian URI')
            .setDesc('')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.addObsidianURI)
                    .onChange((value) => {
                        this.addObsidianURI = value;
                    });
            });

        this.addSetting()
            .setName('Export location')
            .addButton((button) => {
                button
                    .setButtonText('Browse')
                    .onClick(async () => {
                        const fileHandle = await window.showSaveFilePicker({
                            suggestedName: this.file.basename + '-export.pdf'
                        });
                        console.log(fileHandle);
                    });
            });

        this.addSetting()
            .addButton((button) => {
                button
                    .setButtonText('Export')
                    .setCta()
                    .onClick(() => {
                        new BacklinkHighlightExporter(this.plugin).export();
                    });
            })
            .addButton((button) => {
                button
                    .setButtonText('Cancel')
                    .onClick(() => this.close());
            })
            .then((setting) => setting.setClass('no-border'));
    }

    onClose() {
        this.contentEl.empty();
    }

    addSetting() {
        return new Setting(this.contentEl);
    }
}


export class BacklinkHighlightExporter {
    app: App;
    plugin: PDFPlus;
    api: PDFPlusAPI;
    constructor(plugin: PDFPlus) {
        this.plugin = plugin;
        this.app = plugin.app;
        this.api = plugin.api;
    }

    async export() {
        new Notice('Not implemented yet.')
    }
}
