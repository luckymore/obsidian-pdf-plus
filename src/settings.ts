import { Component, DropdownComponent, HexString, IconName, MarkdownRenderer, Notice, ObsidianProtocolData, Platform, PluginSettingTab, Setting, TextAreaComponent, TextComponent, debounce, setIcon, setTooltip } from 'obsidian';

import PDFPlus from 'main';
import { ExtendedPaneType, isSidebarType } from 'lib/workspace-lib';
import { AutoFocusTarget } from 'lib/copy-link';
import { CommandSuggest, FuzzyFolderSuggest, FuzzyMarkdownFileSuggest, KeysOfType, capitalize, getModifierNameInPlatform, isHexString } from 'utils';
import { PAGE_LABEL_UPDATE_METHODS, PageLabelUpdateMethod } from 'modals';
import { ScrollMode, SpreadMode } from 'pdfjs-enums';


const SELECTION_BACKLINK_VISUALIZE_STYLE = {
	'highlight': 'Highlight',
	'underline': 'Underline',
} as const;
export type SelectionBacklinkVisualizeStyle = keyof typeof SELECTION_BACKLINK_VISUALIZE_STYLE;

const HOVER_HIGHLIGHT_ACTIONS = {
	'open': 'Open backlink',
	'preview': 'Popover preview of backlink',
} as const;

const PANE_TYPE: Record<ExtendedPaneType, string> = {
	'': 'Current tab',
	'tab': 'New tab',
	'right': 'Split right',
	'left': 'Split left',
	'down': 'Split down',
	'up': 'Split up',
	'window': 'New window',
	'right-sidebar': 'Right sidebar',
	'left-sidebar': 'Left sidebar'
};

const AUTO_FOCUS_TARGETS: Record<AutoFocusTarget, string> = {
	'last-paste': 'Last pasted .md',
	'last-active': 'Last active .md',
	'last-active-and-open': 'Last active & open .md',
	'last-paste-then-last-active': 'Last pasted .md if any, otherwise last active .md',
	'last-paste-then-last-active-and-open': 'Last pasted .md if any, otherwise last active & open .md',
	'last-active-and-open-then-last-paste': 'Last active & open .md if any, otherwise last pasted .md',
};

const NEW_FILE_LOCATIONS = {
	'root': 'Vault folder',
	'current': 'Same folder as current file',
	'folder': 'In the folder specified below',
} as const;
type NewFileLocation = keyof typeof NEW_FILE_LOCATIONS;

const IMAGE_EXTENSIONS = [
	'png',
	'jpg',
	'webp',
	'bmp',
] as const;
export type ImageExtension = typeof IMAGE_EXTENSIONS[number];

export interface namedTemplate {
	name: string;
	template: string;
}

export const DEFAULT_BACKLINK_HOVER_COLOR = 'green';

const ACTION_ON_CITATION_HOVER = {
	'none': 'Same as other internal links',
	'pdf-plus-bib-popover': 'PDF++\'s custom bibliography popover',
	'google-scholar-popover': 'Google Scholar popover',
} as const;

export interface PDFPlusSettings {
	displayTextFormats: namedTemplate[];
	defaultDisplayTextFormatIndex: number,
	syncDisplayTextFormat: boolean;
	syncDefaultDisplayTextFormat: boolean;
	copyCommands: namedTemplate[];
	useAnotherCopyTemplateWhenNoSelection: boolean;
	copyTemplateWhenNoSelection: string;
	trimSelectionEmbed: boolean;
	embedMargin: number;
	noSidebarInEmbed: boolean;
	noSpreadModeInEmbed: boolean;
	embedUnscrollable: boolean;
	singleTabForSinglePDF: boolean;
	highlightExistingTab: boolean;
	existingTabHighlightOpacity: number;
	existingTabHighlightDuration: number;
	paneTypeForFirstPDFLeaf: ExtendedPaneType;
	openLinkNextToExistingPDFTab: boolean;
	openPDFWithDefaultApp: boolean;
	openPDFWithDefaultAppAndObsidian: boolean;
	focusObsidianAfterOpenPDFWithDefaultApp: boolean;
	syncWithDefaultApp: boolean;
	dontActivateAfterOpenPDF: boolean;
	dontActivateAfterOpenMD: boolean;
	highlightDuration: number;
	noTextHighlightsInEmbed: boolean;
	noAnnotationHighlightsInEmbed: boolean;
	persistentTextHighlightsInEmbed: boolean;
	persistentAnnotationHighlightsInEmbed: boolean;
	highlightBacklinks: boolean;
	selectionBacklinkVisualizeStyle: SelectionBacklinkVisualizeStyle;
	dblclickEmbedToOpenLink: boolean;
	highlightBacklinksPane: boolean;
	highlightOnHoverBacklinkPane: boolean;
	backlinkHoverColor: HexString;
	colors: Record<string, HexString>;
	defaultColor: string;
	defaultColorPaletteItemIndex: number;
	syncColorPaletteItem: boolean;
	syncDefaultColorPaletteItem: boolean;
	colorPaletteInToolbar: boolean;
	noColorButtonInColorPalette: boolean;
	colorPaletteInEmbedToolbar: boolean;
	showStatusInToolbar: boolean;
	/** Currently not working due to the major refactor in 0.37.0. */
	highlightColorSpecifiedOnly: boolean;
	doubleClickHighlightToOpenBacklink: boolean;
	hoverHighlightAction: keyof typeof HOVER_HIGHLIGHT_ACTIONS;
	paneTypeForFirstMDLeaf: ExtendedPaneType;
	singleMDLeafInSidebar: boolean;
	alwaysUseSidebar: boolean;
	ignoreExistingMarkdownTabIn: ('leftSplit' | 'rightSplit' | 'floatingSplit')[];
	defaultColorPaletteActionIndex: number,
	syncColorPaletteAction: boolean;
	syncDefaultColorPaletteAction: boolean;
	proxyMDProperty: string;
	hoverPDFLinkToOpen: boolean;
	ignoreHeightParamInPopoverPreview: boolean;
	filterBacklinksByPageDefault: boolean;
	showBacklinkToPage: boolean;
	enableHoverPDFInternalLink: boolean;
	recordPDFInternalLinkHistory: boolean;
	alwaysRecordHistory: boolean;
	renderMarkdownInStickyNote: boolean;
	enablePDFEdit: boolean;
	author: string;
	writeHighlightToFileOpacity: number;
	defaultWriteFileToggle: boolean;
	syncWriteFileToggle: boolean;
	syncDefaultWriteFileToggle: boolean;
	enableAnnotationContentEdit: boolean;
	warnEveryAnnotationDelete: boolean;
	warnBacklinkedAnnotationDelete: boolean;
	enableAnnotationDeletion: boolean;
	enableEditEncryptedPDF: boolean;
	pdfLinkColor: HexString;
	pdfLinkBorder: boolean;
	replaceContextMenu: boolean;
	executeBuiltinCommandForOutline: boolean;
	executeBuiltinCommandForZoom: boolean;
	executeFontSizeAdjusterCommand: boolean;
	closeSidebarWithShowCommandIfExist: boolean;
	autoHidePDFSidebar: boolean;
	outlineDrag: boolean;
	outlineContextMenu: boolean;
	outlineLinkDisplayTextFormat: string;
	outlineLinkCopyFormat: string;
	recordHistoryOnOutlineClick: boolean;
	popoverPreviewOnOutlineHover: boolean;
	thumbnailDrag: boolean;
	thumbnailContextMenu: boolean;
	thumbnailLinkDisplayTextFormat: string;
	thumbnailLinkCopyFormat: string;
	recordHistoryOnThumbnailClick: boolean;
	popoverPreviewOnThumbnailHover: boolean;
	annotationPopupDrag: boolean;
	useCallout: boolean;
	calloutType: string;
	calloutIcon: string;
	// canvasContextMenu: boolean;
	highlightBacklinksInEmbed: boolean;
	highlightBacklinksInHoverPopover: boolean;
	highlightBacklinksInCanvas: boolean;
	clickPDFInternalLinkWithModifierKey: boolean;
	clickOutlineItemWithModifierKey: boolean;
	clickThumbnailWithModifierKey: boolean;
	focusEditorAfterAutoPaste: boolean;
	respectCursorPositionWhenAutoPaste: boolean;
	autoCopy: boolean;
	autoFocus: boolean;
	autoPaste: boolean;
	autoFocusTarget: AutoFocusTarget;
	autoPasteTarget: AutoFocusTarget;
	openAutoFocusTargetIfNotOpened: boolean;
	howToOpenAutoFocusTargetIfNotOpened: ExtendedPaneType | 'hover-editor';
	closeHoverEditorWhenLostFocus: boolean;
	closeSidebarWhenLostFocus: boolean;
	openAutoFocusTargetInEditingView: boolean;
	executeCommandWhenTargetNotIdentified: boolean;
	commandToExecuteWhenTargetNotIdentified: string;
	autoPasteTargetDialogTimeoutSec: number;
	autoCopyToggleRibbonIcon: boolean;
	autoCopyIconName: string;
	autoFocusToggleRibbonIcon: boolean;
	autoFocusIconName: string;
	autoPasteToggleRibbonIcon: boolean;
	autoPasteIconName: string;
	viewSyncFollowPageNumber: boolean;
	viewSyncPageDebounceInterval: number;
	openAfterExtractPages: boolean;
	howToOpenExtractedPDF: ExtendedPaneType;
	warnEveryPageDelete: boolean;
	warnBacklinkedPageDelete: boolean;
	extractPageInPlace: boolean;
	askExtractPageInPlace: boolean;
	pageLabelUpdateWhenInsertPage: PageLabelUpdateMethod;
	pageLabelUpdateWhenDeletePage: PageLabelUpdateMethod;
	pageLabelUpdateWhenExtractPage: PageLabelUpdateMethod;
	askPageLabelUpdateWhenInsertPage: boolean;
	askPageLabelUpdateWhenDeletePage: boolean;
	askPageLabelUpdateWhenExtractPage: boolean;
	copyOutlineAsListFormat: string;
	copyOutlineAsListDisplayTextFormat: string;
	copyOutlineAsHeadingsFormat: string;
	copyOutlineAsHeadingsDisplayTextFormat: string;
	copyOutlineAsHeadingsMinLevel: number;
	newFileNameFormat: string;
	newFileTemplatePath: string;
	newPDFLocation: NewFileLocation;
	newPDFFolderPath: string;
	rectEmbedStaticImage: boolean;
	rectImageFormat: 'file' | 'data-url';
	rectImageExtension: ImageExtension;
	rectEmbedResolution: number;
	zoomToFitRect: boolean;
	includeColorWhenCopyingRectLink: boolean;
	backlinkIconSize: number;
	showBacklinkIconForSelection: boolean;
	showBacklinkIconForAnnotation: boolean;
	showBacklinkIconForOffset: boolean;
	showBacklinkIconForRect: boolean;
	showBoundingRectForBacklinkedAnnot: boolean;
	hideReplyAnnotation: boolean;
	showCopyLinkToSearchInContextMenu: boolean;
	searchLinkHighlightAll: 'true' | 'false' | 'default';
	searchLinkCaseSensitive: 'true' | 'false' | 'default';
	searchLinkMatchDiacritics: 'true' | 'false' | 'default';
	searchLinkEntireWord: 'true' | 'false' | 'default';
	dontFitWidthWhenOpenPDFLink: boolean;
	preserveCurrentLeftOffsetWhenOpenPDFLink: boolean;
	defaultZoomValue: string; // 'page-width' | 'page-height' | 'page-fit' | '<PERCENTAGE>'
	scrollModeOnLoad: ScrollMode;
	spreadModeOnLoad: SpreadMode;
	hoverableDropdownMenuInToolbar: boolean;
	zoomLevelInputBoxInToolbar: boolean;
	popoverPreviewOnExternalLinkHover: boolean;
	actionOnCitationHover: keyof typeof ACTION_ON_CITATION_HOVER;
	anystylePath: string;
}

export const DEFAULT_SETTINGS: PDFPlusSettings = {
	displayTextFormats: [
		// {
		// 	name: 'Obsidian default',
		// 	template: '{{file.basename}}, page {{page}}',
		// },
		{
			name: 'Title & page',
			template: '{{file.basename}}, p.{{pageLabel}}',
		},
		{
			name: 'Page only',
			template: 'p.{{pageLabel}}',
		},
		{
			name: 'Text',
			template: '{{text}}',
		}
	],
	defaultDisplayTextFormatIndex: 0,
	syncDisplayTextFormat: true,
	syncDefaultDisplayTextFormat: false,
	copyCommands: [
		{
			name: 'Quote',
			template: '> ({{linkWithDisplay}})\n> {{selection}}\n',
		},
		{
			name: 'Link only',
			template: '{{linkWithDisplay}}'
		},
		{
			name: 'Embed',
			template: '!{{link}}',
		},
		{
			name: 'Callout',
			template: '> [!{{calloutType}}|{{color}}] {{linkWithDisplay}}\n> {{text}}\n',
		},
		{
			name: 'Quote in callout',
			template: '> [!{{calloutType}}|{{color}}] {{linkWithDisplay}}\n> > {{text}}\n> \n> ',
		}
	],
	useAnotherCopyTemplateWhenNoSelection: false,
	copyTemplateWhenNoSelection: '{{linkToPageWithDisplay}}',
	trimSelectionEmbed: false,
	embedMargin: 50,
	noSidebarInEmbed: true,
	noSpreadModeInEmbed: true,
	embedUnscrollable: false,
	singleTabForSinglePDF: true,
	highlightExistingTab: false,
	existingTabHighlightOpacity: 0.5,
	existingTabHighlightDuration: 0.75,
	paneTypeForFirstPDFLeaf: 'left',
	openLinkNextToExistingPDFTab: true,
	openPDFWithDefaultApp: false,
	openPDFWithDefaultAppAndObsidian: true,
	focusObsidianAfterOpenPDFWithDefaultApp: true,
	syncWithDefaultApp: false,
	dontActivateAfterOpenPDF: true,
	dontActivateAfterOpenMD: true,
	highlightDuration: 0.75,
	noTextHighlightsInEmbed: false,
	noAnnotationHighlightsInEmbed: true,
	persistentTextHighlightsInEmbed: true,
	persistentAnnotationHighlightsInEmbed: false,
	highlightBacklinks: true,
	selectionBacklinkVisualizeStyle: 'highlight',
	dblclickEmbedToOpenLink: true,
	highlightBacklinksPane: true,
	highlightOnHoverBacklinkPane: true,
	backlinkHoverColor: '',
	colors: {
		'Yellow': '#ffd000',
		'Red': '#ea5252',
		'Note': '#086ddd',
		'Important': '#bb61e5',
	},
	defaultColor: '',
	defaultColorPaletteItemIndex: 0,
	syncColorPaletteItem: true,
	syncDefaultColorPaletteItem: false,
	colorPaletteInToolbar: true,
	noColorButtonInColorPalette: true,
	colorPaletteInEmbedToolbar: false,
	showStatusInToolbar: true,
	highlightColorSpecifiedOnly: false,
	doubleClickHighlightToOpenBacklink: true,
	hoverHighlightAction: 'preview',
	paneTypeForFirstMDLeaf: 'right',
	singleMDLeafInSidebar: true,
	alwaysUseSidebar: true,
	ignoreExistingMarkdownTabIn: [],
	defaultColorPaletteActionIndex: 4,
	syncColorPaletteAction: true,
	syncDefaultColorPaletteAction: false,
	proxyMDProperty: 'PDF',
	hoverPDFLinkToOpen: false,
	ignoreHeightParamInPopoverPreview: true,
	filterBacklinksByPageDefault: true,
	showBacklinkToPage: true,
	enableHoverPDFInternalLink: true,
	recordPDFInternalLinkHistory: true,
	alwaysRecordHistory: true,
	renderMarkdownInStickyNote: true,
	enablePDFEdit: false,
	author: '',
	writeHighlightToFileOpacity: 0.2,
	defaultWriteFileToggle: false,
	syncWriteFileToggle: true,
	syncDefaultWriteFileToggle: false,
	enableAnnotationDeletion: true,
	warnEveryAnnotationDelete: false,
	warnBacklinkedAnnotationDelete: true,
	enableAnnotationContentEdit: true,
	enableEditEncryptedPDF: false,
	pdfLinkColor: '#04a802',
	pdfLinkBorder: false,
	replaceContextMenu: true,
	executeBuiltinCommandForOutline: true,
	executeBuiltinCommandForZoom: true,
	executeFontSizeAdjusterCommand: true,
	closeSidebarWithShowCommandIfExist: true,
	autoHidePDFSidebar: false,
	outlineDrag: true,
	outlineContextMenu: true,
	outlineLinkDisplayTextFormat: '{{file.basename}}, {{text}}',
	outlineLinkCopyFormat: '{{linkWithDisplay}}',
	recordHistoryOnOutlineClick: true,
	popoverPreviewOnOutlineHover: true,
	thumbnailDrag: true,
	thumbnailContextMenu: true,
	thumbnailLinkDisplayTextFormat: '{{file.basename}}, page {{pageLabel}}',
	thumbnailLinkCopyFormat: '{{linkWithDisplay}}',
	recordHistoryOnThumbnailClick: true,
	popoverPreviewOnThumbnailHover: true,
	annotationPopupDrag: true,
	useCallout: true,
	calloutType: 'PDF',
	calloutIcon: 'highlighter',
	// canvasContextMenu: true
	highlightBacklinksInEmbed: false,
	highlightBacklinksInHoverPopover: false,
	highlightBacklinksInCanvas: true,
	clickPDFInternalLinkWithModifierKey: true,
	clickOutlineItemWithModifierKey: true,
	clickThumbnailWithModifierKey: true,
	focusEditorAfterAutoPaste: true,
	respectCursorPositionWhenAutoPaste: true,
	autoCopy: false,
	autoFocus: false,
	autoPaste: false,
	autoFocusTarget: 'last-active-and-open-then-last-paste',
	autoPasteTarget: 'last-active-and-open-then-last-paste',
	openAutoFocusTargetIfNotOpened: true,
	howToOpenAutoFocusTargetIfNotOpened: 'right',
	closeHoverEditorWhenLostFocus: true,
	closeSidebarWhenLostFocus: true,
	openAutoFocusTargetInEditingView: true,
	executeCommandWhenTargetNotIdentified: true,
	commandToExecuteWhenTargetNotIdentified: 'switcher:open',
	autoPasteTargetDialogTimeoutSec: 20,
	autoCopyToggleRibbonIcon: true,
	autoCopyIconName: 'highlighter',
	autoFocusToggleRibbonIcon: true,
	autoFocusIconName: 'zap',
	autoPasteToggleRibbonIcon: true,
	autoPasteIconName: 'clipboard-paste',
	viewSyncFollowPageNumber: true,
	viewSyncPageDebounceInterval: 0.3,
	openAfterExtractPages: true,
	howToOpenExtractedPDF: 'tab',
	warnEveryPageDelete: false,
	warnBacklinkedPageDelete: true,
	extractPageInPlace: false,
	askExtractPageInPlace: true,
	pageLabelUpdateWhenInsertPage: 'keep',
	pageLabelUpdateWhenDeletePage: 'keep',
	pageLabelUpdateWhenExtractPage: 'keep',
	askPageLabelUpdateWhenInsertPage: true,
	askPageLabelUpdateWhenDeletePage: true,
	askPageLabelUpdateWhenExtractPage: true,
	copyOutlineAsListFormat: '{{linkWithDisplay}}',
	copyOutlineAsListDisplayTextFormat: '{{text}}',
	copyOutlineAsHeadingsFormat: '{{text}}\n\n{{linkWithDisplay}}',
	copyOutlineAsHeadingsDisplayTextFormat: 'p.{{pageLabel}}',
	copyOutlineAsHeadingsMinLevel: 2,
	newFileNameFormat: '',
	newFileTemplatePath: '',
	newPDFLocation: 'current',
	newPDFFolderPath: '',
	rectEmbedStaticImage: false,
	rectImageFormat: 'file',
	rectImageExtension: 'webp',
	zoomToFitRect: false,
	rectEmbedResolution: 100,
	includeColorWhenCopyingRectLink: true,
	backlinkIconSize: 50,
	showBacklinkIconForSelection: false,
	showBacklinkIconForAnnotation: false,
	showBacklinkIconForOffset: true,
	showBacklinkIconForRect: false,
	showBoundingRectForBacklinkedAnnot: false,
	hideReplyAnnotation: false,
	showCopyLinkToSearchInContextMenu: true,
	searchLinkHighlightAll: 'true',
	searchLinkCaseSensitive: 'true',
	searchLinkMatchDiacritics: 'default',
	searchLinkEntireWord: 'false',
	dontFitWidthWhenOpenPDFLink: true,
	preserveCurrentLeftOffsetWhenOpenPDFLink: false,
	defaultZoomValue: 'page-width',
	scrollModeOnLoad: ScrollMode.VERTICAL,
	spreadModeOnLoad: SpreadMode.NONE,
	hoverableDropdownMenuInToolbar: true,
	zoomLevelInputBoxInToolbar: true,
	popoverPreviewOnExternalLinkHover: true,
	actionOnCitationHover: 'pdf-plus-bib-popover',
	anystylePath: '',
};


export function isPDFPlusSettingsKey(key: string): key is keyof PDFPlusSettings {
	return DEFAULT_SETTINGS.hasOwnProperty(key);
}


export class PDFPlusSettingTab extends PluginSettingTab {
	component: Component;
	items: Partial<Record<keyof PDFPlusSettings, Setting>>;
	headings: Map<string, Setting>;
	iconHeadings: Map<string, Setting>;
	headerEls: Map<string, HTMLElement>;
	promises: Promise<any>[];

	contentEl: HTMLElement;
	headerContainerEl: HTMLElement;

	constructor(public plugin: PDFPlus) {
		super(plugin.app, plugin);
		this.component = new Component();
		this.items = {};
		this.headings = new Map();
		this.iconHeadings = new Map();
		this.headerEls = new Map();
		this.promises = [];

		this.containerEl.addClass('pdf-plus-settings');
		this.headerContainerEl = this.containerEl.createDiv('header-container');
		this.contentEl = this.containerEl.createDiv('content');
	}

	addSetting(settingName?: keyof PDFPlusSettings) {
		const item = new Setting(this.contentEl);
		if (settingName) this.items[settingName] = item;
		return item;
	}

	addHeading(heading: string, id: string, icon?: IconName, processHeaderDom?: (dom: { headerEl: HTMLElement, iconEl: HTMLElement, titleEl: HTMLElement }) => void) {
		const setting = this.addSetting()
			.setName(heading)
			.setHeading()
			.then((setting) => {
				if (icon) {
					const parentEl = setting.settingEl.parentElement;
					if (parentEl) {
						parentEl.insertBefore(createDiv('spacer'), setting.settingEl);
					}

					const iconEl = createDiv();
					setting.settingEl.prepend(iconEl)
					setIcon(iconEl, icon);

					setting.settingEl.addClass('pdf-plus-setting-heading');
				}
			});

		this.headings.set(id, setting);

		if (icon) {
			this.headerContainerEl.createDiv('clickable-icon header', (headerEl) => {
				const iconEl = headerEl.createDiv();
				setIcon(iconEl, icon);

				const titleEl = headerEl.createDiv('header-title');
				titleEl.setText(heading);

				setTooltip(headerEl, heading);

				this.component.registerDomEvent(headerEl, 'click', (evt) => {
					(setting.settingEl.previousElementSibling ?? setting.settingEl).scrollIntoView({ behavior: 'smooth' });
					this.updateHeaderElClassOnScroll(evt);
				});

				processHeaderDom?.({ headerEl, iconEl, titleEl });

				this.iconHeadings.set(id, setting);
				this.headerEls.set(id, headerEl);
			});
		}

		return setting;
	}

	updateHeaderElClass() {
		const tabHeight = this.containerEl.getBoundingClientRect().height;

		const headingEntries = Array.from(this.iconHeadings.entries());
		for (let i = 0; i < headingEntries.length; i++) {
			const top = headingEntries[i][1].settingEl.getBoundingClientRect().top;
			const bottom = headingEntries[i + 1]?.[1].settingEl.getBoundingClientRect().top
				?? this.contentEl.getBoundingClientRect().bottom;
			const isVisible = top <= tabHeight * 0.85 && bottom >= tabHeight * 0.2 + this.headerContainerEl.clientHeight;
			const id = headingEntries[i][0];
			this.headerEls.get(id)?.toggleClass('is-active', isVisible);
		}
	}

	updateHeaderElClassOnScroll(evt?: MouseEvent) {
		const win = evt?.win ?? activeWindow;
		const timer = win.setInterval(() => this.updateHeaderElClass(), 50);
		win.setTimeout(() => win.clearInterval(timer), 1500);
	}

	scrollTo(settingName: keyof PDFPlusSettings, options?: { behavior: ScrollBehavior }) {
		const setting = this.items[settingName];
		if (setting) this.scrollToSetting(setting, options);
	}

	scrollToHeading(id: string, options?: { behavior: ScrollBehavior }) {
		const setting = this.headings.get(id);
		if (setting) this.scrollToSetting(setting, options);
	}

	scrollToSetting(setting: Setting, options?: { behavior: ScrollBehavior }) {
		const el = setting.settingEl;
		if (el) this.containerEl.scrollTo({ top: el.offsetTop - this.headerContainerEl.offsetHeight, ...options });
	}

	openFromObsidianUrl(params: ObsidianProtocolData) {
		const id = params.setting;
		if (id.startsWith('heading:')) {
			this.plugin.openSettingTab()
				.scrollToHeading(id.slice('heading:'.length));
		} else if (isPDFPlusSettingsKey(id)) {
			this.plugin.openSettingTab()
				.scrollTo(id);
		}
		return;
	}

	getVisibilityToggler(setting: Setting, condition: () => boolean) {
		const toggleVisibility = () => {
			condition() ? setting.settingEl.show() : setting.settingEl.hide();
		}
		toggleVisibility();
		return toggleVisibility;
	}

	addTextSetting(settingName: KeysOfType<PDFPlusSettings, string>, placeholder?: string, onBlurOrEnter?: (setting: Setting) => any) {
		const setting = this.addSetting(settingName)
			.addText((text) => {
				text.setValue(this.plugin.settings[settingName])
					.setPlaceholder(placeholder ?? '')
					.then((text) => {
						if (placeholder) {
							text.inputEl.size = Math.max(text.inputEl.size, text.inputEl.placeholder.length);
						}
					})
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
					});
				if (onBlurOrEnter) {
					this.component.registerDomEvent(text.inputEl, 'blur', () => {
						onBlurOrEnter(setting)
					});
					this.component.registerDomEvent(text.inputEl, 'keypress', (evt) => {
						if (evt.key === 'Enter') onBlurOrEnter(setting);
					});
				}
			});
		return setting;
	}

	addTextAreaSetting(settingName: KeysOfType<PDFPlusSettings, string>, placeholder?: string, onBlur?: () => any) {
		return this.addSetting(settingName)
			.addTextArea((text) => {
				text.setValue(this.plugin.settings[settingName])
					.setPlaceholder(placeholder ?? '')
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
					});
				if (onBlur) this.component.registerDomEvent(text.inputEl, 'blur', onBlur);
			});
	}

	addNumberSetting(settingName: KeysOfType<PDFPlusSettings, number>) {
		return this.addSetting(settingName)
			.addText((text) => {
				text.setValue('' + this.plugin.settings[settingName])
					.setPlaceholder('' + DEFAULT_SETTINGS[settingName])
					.then((text) => text.inputEl.type = 'number')
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value === '' ? DEFAULT_SETTINGS[settingName] : +value;
						await this.plugin.saveSettings();
					});
			});
	}

	addToggleSetting(settingName: KeysOfType<PDFPlusSettings, boolean>, extraOnChange?: (value: boolean) => void) {
		return this.addSetting(settingName)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings[settingName])
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
						extraOnChange?.(value);
					});
			});
	}

	addColorPickerSetting(settingName: KeysOfType<PDFPlusSettings, HexString>, extraOnChange?: (value: HexString) => void) {
		return this.addSetting(settingName)
			.addColorPicker((picker) => {
				picker.setValue(this.plugin.settings[settingName])
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
						extraOnChange?.(value);
					});
			});
	}

	addDropdownSetting(settingName: KeysOfType<PDFPlusSettings, string>, options: readonly string[], display?: (option: string) => string, extraOnChange?: (value: string) => void): Setting;
	addDropdownSetting(settingName: KeysOfType<PDFPlusSettings, string>, options: Record<string, string>, extraOnChange?: (value: string) => void): Setting;
	addDropdownSetting(settingName: KeysOfType<PDFPlusSettings, string>, ...args: any[]) {
		let options: string[] = [];
		let display = (optionValue: string) => optionValue;
		let extraOnChange = (value: string) => { };
		if (Array.isArray(args[0])) {
			options = args[0];
			if (typeof args[1] === 'function') display = args[1];
			if (typeof args[2] === 'function') extraOnChange = args[2];
		} else {
			options = Object.keys(args[0]);
			display = (optionValue: string) => args[0][optionValue];
			if (typeof args[1] === 'function') extraOnChange = args[1];
		}
		return this.addSetting(settingName)
			.addDropdown((dropdown) => {
				for (const option of options) {
					const displayName = display(option) ?? option;
					dropdown.addOption(option, displayName);
				}
				dropdown.setValue(this.plugin.settings[settingName])
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
						extraOnChange?.(value);
					});
			});
	}

	addIndexDropdownSetting(settingName: KeysOfType<PDFPlusSettings, number>, options: readonly string[], display?: (option: string) => string, extraOnChange?: (value: number) => void): Setting {
		return this.addSetting(settingName)
			.addDropdown((dropdown) => {
				for (const option of options) {
					const displayName = display?.(option) ?? option;
					dropdown.addOption(option, displayName);
				}
				const index = this.plugin.settings[settingName];
				const option = options[index];
				dropdown.setValue(option)
					.onChange(async (value) => {
						const newIndex = options.indexOf(value);
						if (newIndex !== -1) {
							// @ts-ignore
							this.plugin.settings[settingName] = newIndex;
							await this.plugin.saveSettings();
							extraOnChange?.(newIndex);
						}
					});
			});
	}

	addEnumDropdownSetting(settingName: KeysOfType<PDFPlusSettings, number>, enumObj: Record<string, string>, extraOnChange?: (value: number) => void) {
		return this.addSetting(settingName)
			.addDropdown((dropdown) => {
				for (const [key, value] of Object.entries(enumObj)) {
					if (parseInt(key).toString() === key) {
						dropdown.addOption(key, value);
					}
				}
				dropdown.setValue('' + this.plugin.settings[settingName])
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = +value;
						await this.plugin.saveSettings();
						extraOnChange?.(+value);
					});
			});
	}

	addSliderSetting(settingName: KeysOfType<PDFPlusSettings, number>, min: number, max: number, step: number) {
		return this.addSetting(settingName)
			.addSlider((slider) => {
				slider.setLimits(min, max, step)
					.setValue(this.plugin.settings[settingName])
					.setDynamicTooltip()
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
					});
			});
	}

	addDesc(desc: string) {
		return this.addSetting()
			.setDesc(desc);
	}

	addFileLocationSetting(
		settingName: KeysOfType<PDFPlusSettings, NewFileLocation>,
		postProcessDropdownSetting: (setting: Setting) => any,
		folderPathSettingName: KeysOfType<PDFPlusSettings, string>,
		postProcessFolderPathSetting: (setting: Setting) => any
	) {
		return [
			this.addDropdownSetting(settingName, NEW_FILE_LOCATIONS, () => this.redisplay())
				.then(postProcessDropdownSetting),
			this.addSetting()
				.addText((text) => {
					text.setValue(this.plugin.settings[folderPathSettingName]);
					text.inputEl.size = 30;
					new FuzzyFolderSuggest(this.app, text.inputEl)
						.onSelect(({ item: folder }) => {
							// @ts-ignore
							this.plugin.settings[folderPathSettingName] = folder.path;
							this.plugin.saveSettings();
						});
				})
				.then((setting) => {
					postProcessFolderPathSetting(setting);
					if (this.plugin.settings[settingName] !== 'folder') {
						setting.settingEl.hide()
					}
				})
		];
	}

	addFundingButton() {
		const postProcessIcon = (iconEl: Element) => {
			const svg = iconEl.firstElementChild;
			if (svg?.tagName === 'svg') {
				svg.setAttribute('fill', 'var(--color-red)');
				svg.setAttribute('stroke', 'var(--color-red)');
			}
		};

		return this.addHeading(
			'Support development',
			'funding',
			'lucide-heart',
			({ iconEl }) => postProcessIcon(iconEl)
		)
			.setDesc('If you find PDF++ helpful, please consider supporting the development to help me keep this plugin alive.\n\nIf you prefer PayPal, please make donations via Ko-fi. Thank you!')
			.then((setting) => {
				const infoEl = setting.infoEl;
				const iconEl = setting.settingEl.firstElementChild;
				if (!iconEl) return;

				const container = setting.settingEl.createDiv();
				container.appendChild(iconEl);
				container.appendChild(infoEl);
				setting.settingEl.prepend(container);

				setting.settingEl.id = 'pdf-plus-funding';
				container.id = 'pdf-plus-funding-icon-info-container';
				iconEl.id = 'pdf-plus-funding-icon';

				postProcessIcon(iconEl);
			})
			.addButton((button) => {
				button
					.setButtonText('GitHub Sponsors')
					.onClick(() => {
						open('https://github.com/sponsors/RyotaUshio');
					});
			})
			.addButton((button) => {
				button
					.setButtonText('Buy Me a Coffee')
					.onClick(() => {
						open('https://www.buymeacoffee.com/ryotaushio');
					});
			})
			.addButton((button) => {
				button
					.setButtonText('Ko-fi')
					.onClick(() => {
						open('https://ko-fi.com/ryotaushio');
					});
			});
	}

	async renderMarkdown(lines: string[] | string, el: HTMLElement) {
		this.promises.push(this._renderMarkdown(lines, el));
		el.addClass('markdown-rendered');
	}

	async _renderMarkdown(lines: string[] | string, el: HTMLElement) {
		await MarkdownRenderer.render(this.app, Array.isArray(lines) ? lines.join('\n') : lines, el, '', this.component);
		if (el.childNodes.length === 1 && el.firstChild instanceof HTMLParagraphElement) {
			el.replaceChildren(...el.firstChild.childNodes);
		}
	}

	addColorSetting(index: number) {
		const colors = this.plugin.settings.colors;
		let [name, color] = Object.entries(colors)[index];
		const isDefault = this.plugin.settings.defaultColor === name;
		let previousColor = color;
		return this.addSetting()
			.addText((text) => {
				text.setPlaceholder('Color name (case-insensitive)')
					.then((text) => {
						text.inputEl.size = text.inputEl.placeholder.length;
						setTooltip(text.inputEl, 'Color name (case-insensitive)');
					})
					.setValue(name)
					.onChange(async (newName) => {
						if (newName in colors) {
							new Notice('This color name is already used.');
							text.inputEl.addClass('error');
							return;
						}
						text.inputEl.removeClass('error');
						delete colors[name];

						for (const key of ['defaultColor', 'backlinkHoverColor'] as const) {
							const setting = this.items[key];
							if (setting) {
								const optionEl = (setting.components[0] as DropdownComponent).selectEl.querySelector<HTMLOptionElement>(`:scope > option:nth-child(${index + 2})`);
								if (optionEl) {
									optionEl.value = newName;
									optionEl.textContent = newName;
								}
							}
						}

						name = newName;
						colors[name] = color;
						if (isDefault) this.plugin.settings.defaultColor = name;
						await this.plugin.saveSettings();
						this.plugin.loadStyle();
					});
			})
			.addColorPicker((picker) => {
				picker.setValue(color);
				picker.onChange(async (newColor) => {
					previousColor = color;
					color = newColor;
					colors[name] = color;
					await this.plugin.saveSettings();
					this.plugin.loadStyle();
				});
			})
			.addExtraButton((button) => {
				button.setIcon('rotate-ccw')
					.setTooltip('Return to previous color')
					.onClick(async () => {
						color = previousColor;
						colors[name] = color;
						await this.plugin.saveSettings();
						this.plugin.loadStyle();
						this.redisplay();
					});
			})
			.addExtraButton((button) => {
				button.setIcon('trash')
					.setTooltip('Delete')
					.onClick(async () => {
						if (this.plugin.settings.defaultColor === name) {
							this.plugin.settings.defaultColor = '';
						}
						delete colors[name];
						await this.plugin.saveSettings();
						this.plugin.loadStyle();
						this.redisplay();
					});
			});
	}

	addNameValuePairListSetting<Item>(items: Item[], index: number, defaultIndexKey: KeysOfType<PDFPlusSettings, number>, accesors: {
		getName: (item: Item) => string,
		setName: (item: Item, value: string) => void,
		getValue: (item: Item) => string,
		setValue: (item: Item, value: string) => void,
	}, configs: {
		name: {
			placeholder: string,
			formSize: number,
			duplicateMessage: string,
		},
		value: {
			placeholder: string,
			formSize: number,
			formRows?: number, // for multi-line value
		},
		delete: {
			deleteLastMessage: string,
		}
	}) {
		const { getName, setName, getValue, setValue } = accesors;
		const item = items[index];
		const name = getName(item);
		const value = getValue(item);

		return this.addSetting()
			.addText((text) => {
				text.setPlaceholder(configs.name.placeholder)
					.then((text) => {
						text.inputEl.size = configs.name.formSize;
						setTooltip(text.inputEl, configs.name.placeholder);
					})
					.setValue(name)
					.onChange(async (newName) => {
						if (items.some((item) => getName(item) === newName)) {
							new Notice(configs.name.duplicateMessage);
							text.inputEl.addClass('error');
							return;
						}
						text.inputEl.removeClass('error');
						setName(item, newName);

						const setting = this.items[defaultIndexKey];
						if (setting) {
							const optionEl = (setting.components[0] as DropdownComponent).selectEl.querySelector<HTMLOptionElement>(`:scope > option:nth-child(${index + 1})`);
							if (optionEl) {
								optionEl.value = newName;
								optionEl.textContent = newName;
							}
						}

						await this.plugin.saveSettings();
					});
			})
			.then((setting) => {
				if (configs.value.hasOwnProperty('formRows')) {
					setting.addTextArea((textarea) => {
						textarea.setPlaceholder(configs.value.placeholder)
							.then((textarea) => {
								textarea.inputEl.rows = configs.value.formRows!;
								textarea.inputEl.cols = configs.value.formSize;
								setTooltip(textarea.inputEl, configs.value.placeholder);
							})
							.setValue(value)
							.onChange(async (newValue) => {
								setValue(item, newValue);
								await this.plugin.saveSettings();
							});
					});
				} else {
					setting.addText((textarea) => {
						textarea.setPlaceholder(configs.value.placeholder)
							.then((text) => {
								text.inputEl.size = configs.value.formSize;
								setTooltip(text.inputEl, configs.value.placeholder);
							})
							.setValue(value)
							.onChange(async (newValue) => {
								setValue(item, newValue);
								await this.plugin.saveSettings();
							});
					})
				}
			})
			.addExtraButton((button) => {
				button.setIcon('trash')
					.setTooltip('Delete')
					.onClick(async () => {
						if (items.length === 1) {
							new Notice(configs.delete.deleteLastMessage);
							return;
						}
						items.splice(index, 1);
						if (this.plugin.settings[defaultIndexKey] > index) {
							this.plugin.settings[defaultIndexKey]--;
						} else if (this.plugin.settings[defaultIndexKey] === index) {
							// @ts-ignore
							this.plugin.settings[defaultIndexKey] = 0;
						}
						await this.plugin.saveSettings();
						this.redisplay();
					});
			})
			.setClass('no-border');
	}

	addNamedTemplatesSetting(items: namedTemplate[], index: number, defaultIndexKey: KeysOfType<PDFPlusSettings, number>, configs: Parameters<PDFPlusSettingTab['addNameValuePairListSetting']>[4]) {
		return this.addNameValuePairListSetting(
			items,
			index,
			defaultIndexKey, {
			getName: (item) => item.name,
			setName: (item, value) => { item.name = value },
			getValue: (item) => item.template,
			setValue: (item, value) => { item.template = value },
		}, configs);
	}

	addDisplayTextSetting(index: number) {
		return this.addNamedTemplatesSetting(
			this.plugin.settings.displayTextFormats,
			index,
			'defaultDisplayTextFormatIndex', {
			name: {
				placeholder: 'Format name',
				formSize: 30,
				duplicateMessage: 'This format name is already used.',
			},
			value: {
				placeholder: 'Display text format',
				formSize: 50,
			},
			delete: {
				deleteLastMessage: 'You cannot delete the last display text format.',
			}
		});
	}

	addCopyCommandSetting(index: number) {
		return this.addNamedTemplatesSetting(
			this.plugin.settings.copyCommands,
			index,
			'defaultColorPaletteActionIndex', {
			name: {
				placeholder: 'Format name',
				formSize: 30,
				duplicateMessage: 'This format name is already used.',
			},
			value: {
				placeholder: 'Copied text format',
				formSize: 50,
				formRows: 3,
			},
			delete: {
				deleteLastMessage: 'You cannot delete the last copy format.',
			}
		});
	}

	addHotkeySettingButton(setting: Setting, query?: string) {
		setting.addButton((button) => {
			button.setButtonText('Open hotkeys settings')
				.onClick(() => {
					const tab = this.app.setting.openTabById('hotkeys');
					tab.setQuery(query ?? this.plugin.manifest.id);
				});
		});
	}

	addIconSetting(settingName: KeysOfType<PDFPlusSettings, string>, leaveBlankToRemoveIcon: boolean) {
		const normalizeIconNameNoPrefix = (name: string) => {
			if (name.startsWith('lucide-')) {
				return name.slice(7);
			}
			return name;
		};

		const normalizeIconNameWithPrefix = (name: string) => {
			if (!name.startsWith('lucide-')) {
				return 'lucide-' + name;
			}
			return name;
		};

		const renderAndValidateIcon = (setting: Setting) => {
			const iconPreviewEl = setting.controlEl.querySelector<HTMLElement>(':scope>.icon-preview')
				?? setting.controlEl.createDiv('icon-preview');
			setIcon(iconPreviewEl, normalizeIconNameWithPrefix(this.plugin.settings[settingName]));

			const text = setting.components[0] as TextComponent;
			if ((!leaveBlankToRemoveIcon || this.plugin.settings[settingName]) && !iconPreviewEl.childElementCount) {
				text.inputEl.addClass('error');
				setTooltip(text.inputEl, 'No icon found');
			} else {
				text.inputEl.removeClass('error');
				setTooltip(text.inputEl, '');
			}
		};

		return this.addTextSetting(settingName, undefined, (setting) => {
			// @ts-ignore
			this.plugin.settings[settingName] = normalizeIconNameNoPrefix(this.plugin.settings[settingName]);
			this.plugin.saveSettings();
			renderAndValidateIcon(setting);
		})
			.then((setting) => {
				this.renderMarkdown([
					'You can use any icon from [Lucide](https://lucide.dev/icons).'
					+ (leaveBlankToRemoveIcon ? ' Leave blank to remove icons.' : ''),
				], setting.descEl);
			})
			.then(renderAndValidateIcon);
	}

	createLinkTo(id: keyof PDFPlusSettings, name?: string) {
		return createEl('a', '', (el) => {
			el.onclick = (evt) => {
				this.scrollTo(id, { behavior: 'smooth' });
				this.updateHeaderElClassOnScroll(evt);
			}
			activeWindow.setTimeout(() => {
				const setting = this.items[id];
				if (!name && setting) {
					name = '"' + setting.nameEl.textContent + '"'
				}
				el.setText(name ?? '');
			});
		});
	}

	createLinkToHeading(id: string, name?: string) {
		return createEl('a', '', (el) => {
			el.onclick = (evt) => {
				this.scrollToHeading(id, { behavior: 'smooth' });
				this.updateHeaderElClassOnScroll(evt);
			}
			activeWindow.setTimeout(() => {
				const setting = this.headings.get(id);
				if (!name && setting) {
					name = '"' + setting.nameEl.textContent + '"'
				}
				el.setText(name ?? '');
			});
		});
	}

	/** Refresh the setting tab and then scroll back to the original position. */
	redisplay() {
		const scrollTop = this.contentEl.scrollTop;
		this.display();
		this.contentEl.scroll({ top: scrollTop });
	}

	async display(): Promise<void> {
		this.headerContainerEl.empty();
		this.contentEl.empty();
		this.promises = [];
		this.component.load();


		activeWindow.setTimeout(() => this.updateHeaderElClass());
		this.component.registerDomEvent(
			this.contentEl, 'wheel',
			debounce(() => this.updateHeaderElClass(), 100)
		);


		// @ts-ignore
		const noModKey = this.app.internalPlugins.plugins['page-preview'].instance.overrides['pdf-plus'] === false;
		const hoverCmd = `hover${noModKey ? '' : ('+' + getModifierNameInPlatform('Mod').toLowerCase())}`;


		this.contentEl.createDiv('top-note', async (el) => {
			await this.renderMarkdown([
				'> [!IMPORTANT]',
				'> The **Copy & auto-paste link to selection or annotation** command is planned to be removed in the near future. Instead, use the **Copy link to selection or annotation** command after enabling auto-paste using the **Toggle auto-paste** icon in the left ribbon menu or the **Toggle auto-paste** command.',
				'> ',
				'> If you don\'t like this change, feel free to let me know via [GitHub Discussions](https://github.com/RyotaUshio/obsidian-pdf-plus/discussions/112).',
				'',
				'> [!TIP]',
				'> - You can easily navigate through the settings by clicking the icons in the header above.',
				'> - Some settings below require reopening tabs or reloading the plugin to take effect.',
				'> - [Visit the docs](https://ryotaushio.github.io/obsidian-pdf-plus/)',
				'> - <a id="pdf-plus-funding-link-placeholder"></a>',
			], el);
			const linkEl = document.getElementById('pdf-plus-funding-link-placeholder');
			if (linkEl) {
				linkEl.textContent = 'Help me keep PDF++ alive!';
				linkEl.onclick = (evt) => {
					this.scrollToHeading('funding', { behavior: 'smooth' })
					this.updateHeaderElClassOnScroll(evt);
				};
			}
		});


		this.addHeading('Editing PDF files', 'edit', 'lucide-save')
			.then((setting) => {
				this.renderMarkdown([
					'To make the best of PDF++\'s powerful features, it is strongly recommended to enable PDF editing.',
					'',
					'By allowing PDF++ to modify PDF files directly, you can:',
					'- Add, edit and delete highlights and links in PDF files.',
					'- Add, insert, delete or extract PDF pages and auto-update links.',
					'- Add, rename, move and delete outline items.',
					'- Edit [page labels](https://ryotaushio.github.io/obsidian-pdf-plus/page-labels.html).',
					'',
					'[Learn more](https://ryotaushio.github.io/obsidian-pdf-plus/editing-pdfs.html)'
				], setting.descEl);
			});
		this.addToggleSetting('enablePDFEdit', () => this.redisplay())
			.setName('Enable PDF editing')
			.then((setting) => {
				this.renderMarkdown([
					'PDF++ will not modify PDF files themselves unless you turn on this option. <span style="color: var(--text-warning);">The author assumes no responsibility for any data corruption. Please make sure you have a backup of your files.</span>',
				], setting.descEl);
			});
		if (this.plugin.settings.enablePDFEdit) {
			this.addTextSetting('author', 'Your name', (setting) => {
				const inputEl = (setting.components[0] as TextComponent).inputEl;
				inputEl.toggleClass('error', !inputEl.value);
			})
				.setName('Annotation author')
				.setDesc('It must contain at least one character in order to make annotations referenceable & editable within Obsidian.')
				.then((setting) => {
					const inputEl = (setting.components[0] as TextComponent).inputEl;
					inputEl.toggleClass('error', !inputEl.value);
				});
			this.addToggleSetting('enableEditEncryptedPDF')
				.setName('Enable editing encrypted PDF files');
		}


		this.addHeading('Backlink highlighting', 'backlink-highlight', 'lucide-highlighter')
			.setDesc('Annotate PDF files with highlights just by linking to text selection. You can easily copy links to selections using color palette in the toolbar. See the "Color palette" section for the details.')
			.then((setting) => setting.settingEl.addClass('normal-margin-top'));
		this.addToggleSetting('highlightBacklinks')
			.setName('Highlight backlinks in PDF viewer')
			.setDesc('In the PDF viewer, any referenced text will be highlighted for easy identification.');
		this.addDesc('Try turning off the following options if you experience performance issues.');
		this.addToggleSetting('highlightBacklinksInEmbed')
			.setName('Highlight backlinks in PDF embeds')
		this.addToggleSetting('highlightBacklinksInCanvas')
			.setName('Highlight backlinks in Canvas')
		this.addToggleSetting('highlightBacklinksInHoverPopover')
			.setName('Highlight backlinks in hover popover previews')
		this.addDropdownSetting('selectionBacklinkVisualizeStyle', SELECTION_BACKLINK_VISUALIZE_STYLE)
			.setName('Highlight style')
			.setDesc('How backlinks to a text selection should be visualized.')
		this.addDropdownSetting('hoverHighlightAction', HOVER_HIGHLIGHT_ACTIONS, () => this.redisplay())
			.setName('Action when hovering over highlighted text')
			.setDesc(`Easily open backlinks or display a popover preview of it by pressing ${getModifierNameInPlatform('Mod').toLowerCase()} (by default) while hovering over a highlighted text in PDF viewer.`)
		this.addSetting()
			.setName(`Require ${getModifierNameInPlatform('Mod').toLowerCase()} key for the above action`)
			.setDesc('You can toggle this on and off in the core Page Preview plugin settings > PDF++ hover action.')
			.addButton((button) => {
				button.setButtonText('Open page preview settings')
					.onClick(() => {
						this.app.setting.openTabById('page-preview')
					});
			});
		this.addToggleSetting('doubleClickHighlightToOpenBacklink')
			.setName('Double click highlighted text to open the corresponding backlink');

		this.addHeading('How backlinks are opened', 'open-backlink')
			.setDesc(
				'Customize how backlinks are opened when '
				+ (this.plugin.settings.hoverHighlightAction === 'open' ? `${getModifierNameInPlatform('Mod').toLowerCase()}+hovering over or ` : '')
				+ 'double-clicking highlighted text.'
			);
		this.addDropdownSetting('paneTypeForFirstMDLeaf', PANE_TYPE, () => this.redisplay())
			.setName(`How to open the markdown file when no markdown file is opened`);
		if (this.plugin.settings.paneTypeForFirstMDLeaf === 'left-sidebar' || this.plugin.settings.paneTypeForFirstMDLeaf === 'right-sidebar') {
			this.addToggleSetting('alwaysUseSidebar')
				.setName('Always use sidebar to open markdown files from highlighted text')
				.setDesc(`If turned on, the ${this.plugin.settings.paneTypeForFirstMDLeaf === 'left-sidebar' ? 'left' : 'right'} sidebar will be used whether there is existing markdown tabs or not.`)
			this.addToggleSetting('singleMDLeafInSidebar')
				.setName('Don\'t open multiple panes in sidebar')
				.setDesc('Turn this on if you want to open markdown files in a single pane in the sidebar.');
		}
		this.addSetting('ignoreExistingMarkdownTabIn')
			.setName('Ignore existing markdown tabs in...')
			.setDesc('If some notes are opened in the ignored splits, PDF++ will still open the backlink in the way specified in the previous setting. For example, you might want to ignore the left sidebar if you are pinning a certain note (e.g. daily note) in it.')
		const splits = {
			'leftSplit': 'Left sidebar',
			'rightSplit': 'Right sidebar',
			'floatingSplit': 'Secondary window',
		};
		const ignoredSplits = this.plugin.settings.ignoreExistingMarkdownTabIn;
		for (const [_split, displayName] of Object.entries(splits)) {
			const split = _split as keyof typeof splits;
			this.addSetting()
				.addToggle((toggle) => {
					toggle
						.setValue(ignoredSplits.includes(split))
						.onChange((value) => {
							value ? ignoredSplits.push(split) : ignoredSplits.remove(split);
							this.plugin.saveSettings();
						});
				})
				.then((setting) => {
					setting.controlEl.prepend(createEl('span', { text: displayName }));
					setting.settingEl.addClasses(['no-border', 'ignore-split-setting'])
				});
		}

		this.addToggleSetting('dontActivateAfterOpenMD')
			.setName('Don\'t move focus to markdown view after opening a backlink')
			.setDesc('This option will be ignored when you open a link in a tab in the same split as the current tab.')

		this.addHeading('Colors', 'color');
		this.addSetting('colors')
			.setName('Highlight colors')
			.then((setting) => this.renderMarkdown([
				'You can optionally highlight the selection with **a specified color** by appending "&color=`<COLOR NAME>`" to a link text, where `<COLOR NAME>` is one of the colors that you register below. e.g `[[file.pdf#page=1&selection=4,0,5,20&color=red]].` ',
				'Color names are case-insensitive. ',
				'',
				'You can ues the color palette in PDF toolbars to easily copy links with "&color=..." appended automatically. See the "Color palette" section for the details.',
				'',
				'You can also opt not to use this plugin-dependent notation and apply a single color (the "default highlight color" setting) to all highlights.',
				'',
				'These colors are also available as CSS variables, e.g. `--pdf-plus-yellow-rgb`. You can use them for various CSS customizations. See [README](https://github.com/RyotaUshio/obsidian-pdf-plus?tab=readme-ov-file#css-customization) for the details.',
			], setting.descEl))
			.addButton((button) => {
				button
					.setIcon('plus')
					.setTooltip('Add a new color')
					.onClick(() => {
						this.plugin.settings.colors[''] = '#';
						this.redisplay();
					});
			})
		for (let i = 0; i < Object.keys(this.plugin.settings.colors).length; i++) {
			this.addColorSetting(i)
				.setClass('no-border');
		}

		// Commented out because the `highlightColorSpecifiedOnly` option is currently not working
		// due to the major refactoring of the backlink highlighting feature in 0.37.0.
		// TODO: Fix this!

		// this.addToggleSetting('highlightColorSpecifiedOnly', () => this.redisplay())
		// 	.setName('Highlight a backlink only if a color is specified')
		// 	.setDesc('By default, all backlinks are highlighted. If this option is enabled, a backlink will be highlighted only when a color is specified in the link text.');

		// if (!this.plugin.settings.highlightColorSpecifiedOnly) {
		this.addDropdownSetting(
			'defaultColor',
			['', ...Object.keys(this.plugin.settings.colors)],
			(option) => option || 'Obsidian default',
			() => this.plugin.loadStyle()
		)
			.setName('Default highlight color')
			.setDesc('If no color is specified in link text, this color will be used.');
		// }

		this.addHeading('Backlink indicator bounding rectangles', 'backlink-bounding-rect');
		this.addToggleSetting('showBoundingRectForBacklinkedAnnot')
			.setName('Show bounding rectangles for backlinked annotations')
			.setDesc('Bounding rectangles will be shown for annotations with backlinks.');


		this.addHeading('Backlink indicator icons', 'backlink-icon')
			.setDesc('Show icons for text selections, annotations, offsets and rectangular selections with backlinks.');
		this.addToggleSetting('showBacklinkIconForSelection')
			.setName('Show icon for text selection with backlinks');
		this.addToggleSetting('showBacklinkIconForAnnotation')
			.setName('Show icon for annotation with backlinks');
		this.addToggleSetting('showBacklinkIconForOffset')
			.setName('Show icon for offset backlinks');
		this.addToggleSetting('showBacklinkIconForRect')
			.setName('Show icon for rectangular selection backlinks');
		this.addSliderSetting('backlinkIconSize', 10, 100, 5)
			.setName('Icon size');


		this.addHeading('Rectangular selection embeds', 'rect', 'lucide-box-select')
			.then((setting) => {
				this.renderMarkdown([
					'You can embed a specified rectangular area from a PDF page into your note. [Learn more](https://ryotaushio.github.io/obsidian-pdf-plus/embedding-rectangular-selections.html)'
				], setting.descEl);
			});
		this.addSliderSetting('rectEmbedResolution', 10, 200, 1)
			.setName('Rendering resolution')
			.setDesc('The higher the value, the better the rendering quality, but the longer time it takes to render. The default value is 100.');
		this.addToggleSetting('rectEmbedStaticImage', () => this.redisplay())
			.setName('Paste as image')
			.setDesc('By default, rectangular selection embeds are re-rendered every time you open the markdown file, which can slow down the loading time. Turn on this option to replace them with static images and improve the performance.');
		if (this.plugin.settings.rectEmbedStaticImage) {
			this.addDropdownSetting('rectImageFormat', { 'file': 'Create & embed image file', 'data-url': 'Embed as data URL' }, () => this.redisplay())
				.setName('How to embed the image')
				.then((setting) => this.renderMarkdown([
					'- "Create & embed image file": Create an image file and embed it in the markdown file. The image file will be saved in the folder you specify in the "Default location for new attachments" setting in the core Obsidian settings.',
					'- "Embed as data URL": Embed the image as a [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs) without creating a file. This option is useful when you don\'t want to mess up your attachment folder. It also helps you make your notes self-contained.',
				], setting.descEl));
			if (this.plugin.settings.rectImageFormat === 'file') {
				this.addDropdownSetting('rectImageExtension', IMAGE_EXTENSIONS)
					.setName('Image file format');
			}
		}
		this.addToggleSetting('includeColorWhenCopyingRectLink')
			.setName('Include the selected color\'s name when copying a link to a rectangular selection')
			.setDesc('When enabled, the name of the color selected in the color palette will be included in the link text. As a result, the rectangular selection will be highlighted with the specified color in the PDF viewer.');
		this.addToggleSetting('zoomToFitRect')
			.setName('Zoom to fit rectangular selection when opening link')
			.setDesc(createFragment((el) => {
				el.appendText('When enabled, the PDF viewer will zoom to fit the rectangular selection when you open a link to it. Otherwise, the viewer will keep the current zoom level.');
				el.appendText('Note: check out the ');
				el.appendChild(this.createLinkTo('dblclickEmbedToOpenLink'));
				el.appendText(' option as well.');
			}));


		this.addHeading('PDF++ callouts', 'callout', 'lucide-quote')
			.then((setting) => {
				this.renderMarkdown(
					'Create [callouts](https://help.obsidian.md/Editing+and+formatting/Callouts) with the same color as the highlight color without any CSS snippet scripting.',
					setting.descEl
				);
			});
		this.addToggleSetting('useCallout')
			.setName('Use PDF++ callouts')
			.then((setting) => {
				this.renderMarkdown([
					'You can also disable this option and choose to use your own custom [CSS snippets](https://help.obsidian.md/Extending+Obsidian/CSS+snippets). See our [README](https://github.com/RyotaUshio/obsidian-pdf-plus?tab=readme-ov-file#css-customization) for the details.'
				], setting.descEl);
			});
		this.addTextSetting('calloutType', undefined, () => this.redisplay())
			.setName('Callout type name')
			.then((setting) => {
				const type = this.plugin.settings.calloutType;
				const colorName = Object.keys(this.plugin.settings.colors).first()?.toLowerCase() ?? 'yellow';
				this.renderMarkdown([
					`For example, if this is set to "${type}", use the following syntax to insert a callout with color "${colorName}":`,
					'',
					'```markdown',
					`> [!${type}|${colorName}] Title`,
					'> Content',
					'```',
					'',
					'You can also use explicit RGB color values like "255, 208, 0" instead of color names.',
					'I recommend setting this as a custom color palette action in the setting below, like so:',
					'',
					'```markdown',
					'> [!{{calloutType}}|{{color}}] {{linkWithDisplay}}',
					'> {{text}}',
					'```',
				], setting.descEl);
			});
		this.addIconSetting('calloutIcon', true)
			.setName('Callout icon');


		this.addHeading('PDF toolbar', 'toolbar', 'lucide-palette')
		this.addToggleSetting('hoverableDropdownMenuInToolbar')
			.setName('Hoverable dropdown menus')
			.setDesc('When enabled, the dropdown menus (⌄) in the PDF toolbar will be opened by hovering over the icon, and you don\'t need to click it.');
		this.addToggleSetting('zoomLevelInputBoxInToolbar')
			.setName('Show zoom level box')
			.setDesc('A input box will be added to the PDF toolbar, which indicated the current zoom level and allows you to set the zoom level by typing a number.');

		this.addHeading('Color palette', 'palette')
			.setDesc('Clicking a color while selecting a range of text will copy a link to the selection with "&color=..." appended.');
		this.addToggleSetting('colorPaletteInToolbar', () => {
			this.redisplay();
			this.plugin.loadStyle();
		})
			.setName('Show color palette in the toolbar')
			.setDesc('A color palette will be added to the toolbar of the PDF viewer.');
		if (this.plugin.settings.colorPaletteInToolbar) {
			this.addToggleSetting('noColorButtonInColorPalette', () => this.plugin.loadStyle())
				.setName('Show "without specifying color" button in the color palette');
			this.addToggleSetting('colorPaletteInEmbedToolbar', () => this.plugin.loadStyle())
				.setName('Show color palette in PDF embeds as well');
			this.addIndexDropdownSetting('defaultColorPaletteItemIndex', ['', ...Object.keys(this.plugin.settings.colors)], (option) => option || 'Don\'t specify')
				.setName('Default color selected in color palette')
				.setDesc('This color will be selected in the color palette in a newly opened PDF viewer.');
			this.addToggleSetting('syncColorPaletteItem', () => this.redisplay())
				.setName('Share a single color among all color palettes')
				.setDesc('If disabled, you can specify a different color for each color palette.');
			if (this.plugin.settings.syncColorPaletteItem) {
				this.addToggleSetting('syncDefaultColorPaletteItem')
					.setName('Share the color with newly opened color palettes as well');
			}
		}


		this.addHeading('Viewer options', 'viewer-option', 'lucide-monitor');
		this.addSetting('defaultZoomValue')
			.setName('Default zoom level')
			.addDropdown((dropdown) => {
				dropdown
					.addOptions({
						'page-width': 'Fit width',
						'page-height': 'Fit height',
						'page-fit': 'Fit page',
						'custom': 'Custom...',
					})
					.setValue(this.plugin.settings.defaultZoomValue.startsWith('page-') ? this.plugin.settings.defaultZoomValue : 'custom')
					.onChange(async (value) => {
						if (value === 'custom') value = '100';
						this.plugin.settings.defaultZoomValue = value;
						toggleCustomZoomLevelSettingVisibility();
						await this.plugin.saveSettings();
					});
			});
		const toggleCustomZoomLevelSettingVisibility = this.getVisibilityToggler(
			this.addSetting()
				.setName('Custom zoom level (%)')
				.addSlider((slider) => {
					slider.setLimits(10, 400, 5)
						.setDynamicTooltip()
						.setValue(this.plugin.settings.defaultZoomValue.startsWith('page-') ? 100 : parseInt(this.plugin.settings.defaultZoomValue))
						.onChange(async (value) => {
							this.plugin.settings.defaultZoomValue = '' + value;
							await this.plugin.saveSettings();
						});
				}),
			() => !this.plugin.settings.defaultZoomValue.startsWith('page-')
		);
		this.addEnumDropdownSetting('scrollModeOnLoad', {
			[ScrollMode.VERTICAL]: 'Vertical',
			[ScrollMode.HORIZONTAL]: 'Horizontal',
			[ScrollMode.WRAPPED]: 'Wrapped',
		}, () => toggleSpreadModeOnLoadSettingVisibility())
			.setName('Default scroll mode');
		const toggleSpreadModeOnLoadSettingVisibility = this.getVisibilityToggler(
			this.addEnumDropdownSetting('spreadModeOnLoad', {
				[SpreadMode.NONE]: 'Single page',
				[SpreadMode.ODD]: 'Two page (odd)',
				[SpreadMode.EVEN]: 'Two page (even)',
			})
				.setName('Default spread mode'),
			() => this.plugin.settings.scrollModeOnLoad !== ScrollMode.WRAPPED
		);


		this.addHeading('Right-click menu in PDF viewer', 'context-menu', 'lucide-mouse-pointer-click')
			.setDesc('Customize the behavior of Obsidian\'s built-in right-click menu in PDF view.')
		this.addToggleSetting('replaceContextMenu', () => this.redisplay())
			.setName('Replace the built-in right-click menu with PDF++\'s custom menu');
		if (!this.plugin.settings.replaceContextMenu) {
			this.addSetting()
				.setName('Display text format')
				.setDesc('You can customize the display text format in the setting "Copied text foramt > Display text format" below.');
		}


		this.addHeading('Copying links via hotkeys', 'copy-hotkeys', 'lucide-keyboard');
		this.addSetting()
			.setName('Set up hotkeys for copying links')
			.then((setting) => {
				this.renderMarkdown([
					'PDF++ offers three commands for quickly copying links via hotkeys.',
					'',
					'1. **Copy link to selection or annotation:**',
					'   Copies a link to the text selection or focused annotation in the PDF viewer, which is formatted according to the options specified in the PDF toolbar.',
					'   <br>If the "Add highlights to file directly" toggle switch in the PDF toolbar is on, it first adds a highlight annotation directly to the PDF file, and then copies the link to the created annotation.',
					'2. **Copy & auto-paste link to selection or annotation:**',
					'  In addition to copying the link, it automatically pastes the copied link at the end of the last active note or the note where you last pasted a link. Note that Canvas is not supported.',
					'  > [!IMPORTANT]',
					'  > This command is planned to be removed in the near future. Instead, use the "Copy link to selection or annotation" command after enabling auto-paste using the "Toggle auto-paste" icon in the left ribbon menu or the "Toggle auto-paste" command. If you don\'t like this change, feel free to let me know via [GitHub Discussions](https://github.com/RyotaUshio/obsidian-pdf-plus/discussions/112).',
					'',
					'The third command is very different from the first two:',
					'',
					'3. **Copy link to current page view:** Copies a link, clicking which will open the PDF file at the current scroll position and zoom level.',
					'',
					'After running this command, you can add the copied link to the PDF file itself: select a range of text, right-click, and then click "Paste copied link to selection".'
				], setting.descEl);
			})
			.then((setting) => this.addHotkeySettingButton(setting, `${this.plugin.manifest.name}: Copy link`));
		this.addSetting()
			.setName('Further workflow enhancements')
			.setDesc(createFragment((el) => {
				el.appendText('See the ')
				el.appendChild(this.createLinkToHeading('auto', '"Auto-copy / auto-focus / auto-paste"'))
				el.appendText(' section below.');
			}));


		this.addHeading('Other shortcut commands', 'other-hotkeys', 'lucide-layers-2')
		this.addSetting()
			.then((setting) => {
				this.renderMarkdown([
					'PDF++ also offers the following commands for reducing mouse clicks on the PDF toolbar by assigning hotkeys to them.',
					'',
					'- **Show outline** / **show thumbnail**',
					'- **Close PDF siderbar**',
					'- **Zoom in** / **zoom out**',
					'- **Fit width** / **fit height**',
					'- **Go to page**: This command brings the cursor to the page number input field in the PDF toolbar. Enter a page number and press Enter to jump to the page.',
					'- **Show copy format menu** / **show display text format menu**: By running thes commands via hotkeys and then using the arrow keys, you can quickly select a format from the menu without using the mouse.',
					'- **Enable PDF edit** / **disable PDF edit**'
				], setting.descEl);
			})
			.then((setting) => this.addHotkeySettingButton(setting));
		this.addToggleSetting('executeBuiltinCommandForOutline')
			.setName('Show outline: when the active file is not PDF, run the core Outline plugin\'s "Show outline" command')
			.setDesc('By turning this on, you can use the same hotkey to show the outline of a markdown file and a PDF file without key conflict.');
		this.addToggleSetting('closeSidebarWithShowCommandIfExist')
			.setName('Show outline / show thumbnail: close the sidebar if it is already open')
			.setDesc('Enabling this will allow you to use the same hotkey to close the sidebar if it is already open.');
		this.addToggleSetting('executeBuiltinCommandForZoom')
			.setName('Zoom in / zoom out: when the active file is not PDF, run the built-in "Zoom in" / "Zoom out" command')
			.setDesc('By turning this on, you can use the same hotkey to zoom in/out a PDF viewer or any other type of view without key conflict.');
		this.addToggleSetting('executeFontSizeAdjusterCommand')
			.setName('Zoom in / zoom out: when the active file is not PDF, run Font Size Adjuster\'s "Increment font size" / "Decrement font size" command')
			.then((setting) => {
				this.renderMarkdown([
					'(Requires the [Font Size Adjuster](obsidian://show-plugin?id=font-size) plugin enabled) ',
					'If both of this option and the above option are enabled, this option will be prioritized. The built-in "Zoom in" / "Zoom out" command will be executed if Font Size Adjuster is not installed or disabled.'
				], setting.descEl);
			});


		this.addHeading('Link copy templates', 'template', 'lucide-copy')
			.setDesc('The template format that will be used when copying a link to a selection or an annotation in PDF viewer. ')
		this.addSetting()
			.then((setting) => this.renderMarkdown([
				// 'The template format that will be used when copying a link to a selection or an annotation in PDF viewer. ',
				'Each `{{...}}` will be evaluated as a JavaScript expression given the variables listed below.',
				'',
				'Available variables are:',
				'',
				'- `file` or `pdf`: The PDF file ([`TFile`](https://docs.obsidian.md/Reference/TypeScript+API/TFile)). Use `file.basename` for the file name without extension, `file.name` for the file name with extension, `file.path` for the full path relative to the vault root, etc.',
				'- `page`: The page number (`Number`). The first page is always page 1.',
				'- `pageLabel`: The page number displayed in the counter in the toolbar (`String`). This can be different from `page`.',
				'    - **Tip**: You can modify page labels with PDF++\'s "Edit page labels" command.',
				'- `pageCount`: The total number of pages (`Number`).',
				'- `text` or `selection`: The selected text (`String`).',
				'- `folder`: The folder containing the PDF file ([`TFolder`](https://docs.obsidian.md/Reference/TypeScript+API/TFolder)). This is an alias for `file.parent`.',
				'- `obsidian`: The Obsidian API. See the [official developer documentation](https://docs.obsidian.md/Home) and the type definition file [`obsidian.d.ts`](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts) for the details.',
				'- `dv`: Available if the [Dataview](obsidian://show-plugin?id=dataview) plugin is enabled. See Dataview\'s [official documentation](https://blacksmithgu.github.io/obsidian-dataview/api/code-reference/) for the details. You can use it almost the same as the `dv` variable available in `dataviewjs` code blocks, but there are some differences. For example, `dv.current()` is not available.',
				// '- `tp`: Available if the [Templater](obsidian://show-plugin?id=templater-obsidian) plugin is enabled. See Templater\'s [official documentation](https://silentvoid13.github.io/Templater/internal-functions/overview.html) for the details.',
				'- `quickAddApi`: Available if the [QuickAdd](obsidian://show-plugin?id=quickadd) plugin is enabled. See QuickAdd\'s [official documentation](https://quickadd.obsidian.guide/docs/QuickAddAPI) for the details.',
				'- `app`: The global Obsidian app object ([`App`](https://docs.obsidian.md/Reference/TypeScript+API/App)).',
				'- and other global variables such as:',
				'  - [`moment`](https://momentjs.com/docs/#/displaying/): For exampe, use `moment().format("YYYY-MM-DD")` to get the current date in the "YYYY-MM-DD" format.',
				'',
				`Additionally, you have access to the following variables when the PDF file has a corresponding markdown file specified via the "${this.plugin.settings.proxyMDProperty}" property(see the "Property to associate a markdown file to a PDF file" setting below): `,
				'',
				'- `md`: The markdown file associated with the PDF file ([`TFile`](https://docs.obsidian.md/Reference/TypeScript+API/TFile)). If there is no such file, this is `null`.',
				'- `properties`: The properties of `md` as an `Object` mapping each property name to the corresponding value. If `md` is `null` or the `md` has no properties, this is an empty object `{}`.',
				'',
				'Furthermore, the following variables are available when the PDF tab is linked to another tab:',
				'',
				'- `linkedFile`: The file opened in the linked tab ([`TFile`](https://docs.obsidian.md/Reference/TypeScript+API/TFile)). If there is no such file, this is `null`.',
				'- `linkedFileProperties`: The properties of `linkedFile` as an `Object` mapping each property name to the corresponding value. If there is no `linkedFile` or the `linkedFile` has no properties, this is an empty object `{}`.'
			], setting.descEl));
		this.addTextSetting('proxyMDProperty', undefined, () => this.redisplay())
			.setName('Property to associate a markdown file to a PDF file')
			.then((setting) => {
				this.renderMarkdown([
					'Create a markdown file with this property to associate it with a PDF file. The PDF file is specified by a link, e.g. `[[file.pdf]]`.',
					'It can be used to store properties/metadata that can be used when copying links.',
					'',
					'If you have the [Dataview](obsidian://show-plugin?id=dataview) plugin installed, you can use Dataview\'s inline field syntax such as `' + this.plugin.settings.proxyMDProperty + ':: [[file.pdf]]`.',
					'',
					'Remarks:',
					'- Make sure the associated markdown file can be uniquely identified. For example, if you have two markdown files `file1.md` and `file2.md` and both of their `' + this.plugin.settings.proxyMDProperty + '` properties point to the same PDF file, PDF++ cannot determine which markdown file is associated with `file.pdf`.',
					'- If you are in Source Mode and using front matter instead of Dataview inline fields, be sure to enclose the link in double quotes.',
				], setting.descEl);
			});
		this.addSetting('displayTextFormats')
			.setName('Display text format')
			.then((setting) => this.renderMarkdown([
				// 'For example, the default format is `{{ file.basename }}, page { { page } } `. Another example of a useful format is `{ { file.basename } }, p.{ { pageLabel } } `. ',
				'This format will be also used when copying a link to a selection or an annotation from the right-click context menu.'
			], setting.descEl))
			.addButton((button) => {
				button
					.setIcon('plus')
					.setTooltip('Add a new display text format')
					.onClick(() => {
						this.plugin.settings.displayTextFormats.push({
							name: '',
							template: '',
						});
						this.redisplay();
					});
			});
		for (let i = 0; i < this.plugin.settings.displayTextFormats.length; i++) {
			this.addDisplayTextSetting(i);
		}
		this.addIndexDropdownSetting('defaultDisplayTextFormatIndex', this.plugin.settings.displayTextFormats.map((format) => format.name), undefined, () => {
			this.plugin.loadStyle();
		})
			.setName('Default display text format')
		this.addToggleSetting('syncDisplayTextFormat')
			.setName('Share a single display text format among all PDF viewers')
			.setDesc('If disabled, you can specify a different display text format for each PDF viewer from the dropdown menu in the PDF toolbar.');
		if (this.plugin.settings.syncDisplayTextFormat) {
			this.addToggleSetting('syncDefaultDisplayTextFormat')
				.setName('Share the display text format with newly opened PDF viewers as well');
		}

		this.addSetting('copyCommands')
			.setName('Custom link copy formats')
			.then((setting) => this.renderMarkdown([
				'Customize the format to use when you copy a link by clicking a color palette item or running the commands while selecting a range of text in PDF viewer.',
				'',
				'In addition to the variables listed above, here you can use',
				'',
				'- `link`: The link without display text, e.g. `[[file.pdf#page=1&selection=0,1,2,3&color=red]]`,',
				'- `linkWithDisplay`: The link with display text, e.g. `[[file.pdf#page=1&selection=0,1,2,3&color=red|file, page 1]]`,',
				'- `linktext`: The text content of the link without brackets and the display text, e.g. `file.pdf#page=1&selection=0,1,2,3&color=red`<br>(if the "Use \\[\\[Wikilinks\\]\\]" setting is turned off, `linktext` will be properly encoded for use in markdown links),',
				'- `display`: The display text formatted according to the above setting, e.g. `file, page 1`,',
				'- `linkToPage`: The link to the page without display text, e.g. `[[file.pdf#page=1]]`,',
				'- `linkToPageWithDisplay`: The link to the page with display text, e.g. `[[file.pdf#page=1|file, page 1]]`,',
				'- `calloutType`: The callout type you specify in the "Callout type name" setting above, in this case, ' + `"${this.plugin.settings.calloutType}", and`,
				'- `color` (or `colorName`): In the case of text selections, this is the name of the selected color in lowercase, e.g. `red`. If no color is specified, it will be an empty string. For text markup annotations (e.g. highlights and underlines), this is the RGB value of the color, e.g. `255,208,0`.',
			], setting.descEl))
			.addButton((button) => {
				button
					.setIcon('plus')
					.setTooltip('Add a new copy command')
					.onClick(() => {
						this.plugin.settings.copyCommands.push({
							name: '',
							template: '',
						});
						this.redisplay();
					});
			});
		for (let i = 0; i < this.plugin.settings.copyCommands.length; i++) {
			this.addCopyCommandSetting(i);
		}
		this.addIndexDropdownSetting('defaultColorPaletteActionIndex', this.plugin.settings.copyCommands.map((command) => command.name), undefined, () => {
			this.plugin.loadStyle();
		})
			.setName('Default action when clicking on color palette')
		this.addToggleSetting('syncColorPaletteAction')
			.setName('Share a single action among all PDF viewers')
			.setDesc('If disabled, you can specify a different action for each PDF viewer from the dropdown menu in the PDF toolbar.');
		if (this.plugin.settings.syncColorPaletteAction) {
			this.addToggleSetting('syncDefaultColorPaletteAction')
				.setName('Share the action with newly opened PDF viewers as well');
		}
		this.addToggleSetting('useAnotherCopyTemplateWhenNoSelection', () => this.redisplay())
			.setName('Use another template when no text is selected')
			.setDesc('For example, you can use this to copy a link to the page when there is no selection.');
		if (this.plugin.settings.useAnotherCopyTemplateWhenNoSelection) {
			this.addTextSetting('copyTemplateWhenNoSelection')
				.setName('Link copy template used when no text is selected');
		}


		this.addHeading('Auto-copy / auto-focus / auto-paste', 'auto', 'lucide-zap')
			.setDesc('Speed up the process of copying & pasting PDF links to your notes with some automation. Note that you can\'t activate both of auto-focus and auto-paste at the same time.');

		this.addHeading('Auto-copy', 'auto-copy')
			.setDesc('If enabled, the "Copy link to selection or annotation" command will be triggered automatically every time you select a range of text in a PDF viewer, meaning you don\'t even have to press a hotkey to copy a link.');
		this.addToggleSetting('autoCopy', () => this.plugin.autoCopyMode.toggle(this.plugin.settings.autoCopy))
			.setName('Enable')
			.setDesc('You can also toggle auto-focus via an icon in the left ribbon menu if the next setting is enabled.');
		this.addToggleSetting('autoCopyToggleRibbonIcon', () => this.redisplay())
			.setName('Show an icon to toggle auto-copy in the left ribbon menu')
			.setDesc('You can also toggle this mode via a command. Reload the plugin after changing this setting to take effect.')
		if (this.plugin.settings.autoCopyToggleRibbonIcon) {
			this.addIconSetting('autoCopyIconName', false)
				.setName('Icon name')
				.then((setting) => {
					setting.descEl.appendText(' Reload the plugin after changing this setting to take effect.');
				});
		}

		this.addHeading('Auto-focus', 'auto-focus')
			.setDesc('If enabled, a markdown file will be focused automatically after copying a link to PDF text selection or annotation.');
		this.addSetting('autoFocus')
			.setName('Enable')
			.setDesc('Recommended if you prefer something less agressive than auto-paste. You can also toggle auto-focus via an icon in the left ribbon menu if the next setting is enabled.')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.autoFocus)
					.onChange((value) => {
						this.plugin.toggleAutoFocus(value);
						this.redisplay(); // Reflect the change to the auto-paste toggle (you canot activate both of them at the same time)
					});
			});
		this.addToggleSetting('autoFocusToggleRibbonIcon', () => this.redisplay())
			.setName('Show an icon to toggle auto-focus in the left ribbon menu')
			.setDesc('You can also toggle auto-focus via a command. Reload the plugin after changing this setting to take effect.');
		if (this.plugin.settings.autoFocusToggleRibbonIcon) {
			this.addIconSetting('autoFocusIconName', false)
				.setName('Icon name')
				.then((setting) => {
					setting.descEl.appendText(' Reload the plugin after changing this setting to take effect.');
				});
		}
		this.addDropdownSetting('autoFocusTarget', AUTO_FOCUS_TARGETS)
			.setName('Target markdown file to focus on');

		this.addHeading('Auto-paste', 'auto-paste')
			.setDesc('If enabled, the copied link to PDF text selection or annotation will be automatically pasted into a markdown file right after copying.');
		this.addSetting('autoPaste')
			.setName('Enable')
			.setDesc('You can also toggle auto-paste via an icon in the left ribbon menu if the next setting is enabled.')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.autoPaste)
					.onChange((value) => {
						this.plugin.toggleAutoPaste(value);
						this.redisplay(); // Reflect the change to the auto-focus toggle (you canot activate both of them at the same time)
					});
			});
		this.addToggleSetting('autoPasteToggleRibbonIcon', () => this.redisplay())
			.setName('Show an icon to toggle auto-paste in the left ribbon menu')
			.setDesc('You can also toggle auto-paste via a command. Reload the plugin after changing this setting to take effect.');
		if (this.plugin.settings.autoPasteToggleRibbonIcon) {
			this.addIconSetting('autoPasteIconName', false)
				.setName('Icon name')
				.then((setting) => {
					setting.descEl.appendText(' Reload the plugin after changing this setting to take effect.');
				});
		}
		this.addDropdownSetting('autoPasteTarget', AUTO_FOCUS_TARGETS)
			.setName('Target markdown file to paste links to');
		this.addToggleSetting('focusEditorAfterAutoPaste')
			.setName('Focus editor after pasting')
			.setDesc('If enabled, auto-paste will focus on the editor after pasting.');
		this.addToggleSetting('respectCursorPositionWhenAutoPaste')
			.setName('Respect current cursor position')
			.setDesc('When enabled, the auto-paste command will paste the copied text at the current cursor position if the target note is already opened. If disabled, the text will be always appended to the end of the note.');

		this.addHeading('General', 'auto-general')
			.setDesc('General settings that apply to both auto-focus and auto-paste.');
		this.addToggleSetting('openAutoFocusTargetIfNotOpened', () => this.redisplay())
			.setName('Open target markdown file if not opened');
		if (this.plugin.settings.openAutoFocusTargetIfNotOpened) {
			this.addDropdownSetting(
				'howToOpenAutoFocusTargetIfNotOpened',
				{ ...PANE_TYPE, 'hover-editor': 'Hover Editor' },
				() => this.redisplay()
			)
				.setName('How to open target markdown file when not opened')
				.then((setting) => {
					this.renderMarkdown(
						'The "Hover Editor" option is available if the [Hover Editor](obsidian://show-plugin?id=obsidian-hover-editor) plugin is enabled.',
						setting.descEl
					);
					if (this.plugin.settings.howToOpenAutoFocusTargetIfNotOpened === 'hover-editor') {
						if (!this.app.plugins.plugins['obsidian-hover-editor']) {
							setting.descEl.addClass('error');
						}
					}
				});
			if (this.plugin.settings.howToOpenAutoFocusTargetIfNotOpened === 'hover-editor') {
				this.addToggleSetting('closeHoverEditorWhenLostFocus')
					.setName('Close Hover Editor when it loses focus')
					.setDesc('This option will not affect the behavior of Hover Editor outside of PDF++.')
			} else if (isSidebarType(this.plugin.settings.howToOpenAutoFocusTargetIfNotOpened)) {
				this.addToggleSetting('closeSidebarWhenLostFocus')
					.setName('Auto-hide sidebar when it loses focus');
			}
			this.addToggleSetting('openAutoFocusTargetInEditingView')
				.setName('Always open in editing view')
				.setDesc('This option can be useful especially when you set the previous option to "Hover Editor".');
		}
		this.addToggleSetting('executeCommandWhenTargetNotIdentified', () => this.redisplay())
			.setName('Execute command when target file cannot be determined')
			.setDesc('When PDF++ cannot determine which markdown file to focus on or paste to, it will execute the command specified in the next option to let you pick a target file.');
		const commandName = this.app.commands.findCommand(`${this.plugin.manifest.id}:create-new-note`)?.name ?? 'PDF++: Create new note for auto-focus or auto-paste';
		if (this.plugin.settings.executeCommandWhenTargetNotIdentified) {
			this.addSetting('commandToExecuteWhenTargetNotIdentified')
				.setName('Command to execute')
				.then((setting) => {
					this.renderMarkdown([
						'Here\'s some examples of useful commands:',
						'',
						`- ${this.app.commands.findCommand('file-explorer:new-file')?.name ?? 'Create new note'}`,
						`- ${this.app.commands.findCommand('file-explorer:new-file-in-new-pane')?.name ?? 'Create note to the right'}`,
						`- ${this.app.commands.findCommand('switcher:open')?.name ?? 'Quick switcher: Open quick switcher'}`,
						'- [Omnisearch](obsidian://show-plugin?id=omnisearch): Vault search',
						'- [Hover Editor](obsidian://show-plugin?id=obsidian-hover-editor): Open new Hover Editor',
						`- **${commandName}**: See below for the details.`,
					], setting.descEl);
				})
				.addText((text) => {
					const id = this.plugin.settings.commandToExecuteWhenTargetNotIdentified;
					const command = this.app.commands.findCommand(id);
					if (command) {
						text.setValue(command.name);
					} else {
						text.inputEl.addClass('error');
						text.setPlaceholder('Command not found');
					}
					text.inputEl.size = 30;
					new CommandSuggest(this, text.inputEl);
				});
			this.addSliderSetting('autoPasteTargetDialogTimeoutSec', 1, 60, 1)
				.setName('[Auto-paste] Maximum time to wait for the command to open the target file (sec)')
				.setDesc('The link will be auto-pasted into the first markdown file that you open within this time frame after the command is executed. If you don\'t open any markdown file during this time, the auto-paste will not occur. This option is not related to auto-focus.');
		}

		this.addHeading(`The "${commandName}" command`, 'create-new-note-command')
			.setDesc('Creates a new note and opens it in a new pane specified in the "How to open target markdown file when not opened" option.');
		this.addTextSetting('newFileNameFormat', 'Leave blank not to specify')
			.setName(`New note title format`)
			.then(async (setting) => {
				await this.renderMarkdown([
					'If this option is left blank or the active file is not a PDF, "Untitled \\*" will be used (if the language is set to English). You can use the following variables: `file`, `folder`, `app`, and other global variables such as `moment`.',
				], setting.descEl);
				setting.descEl.createSpan({ text: 'See ' });
				setting.descEl.appendChild(this.createLinkToHeading('template', 'above'));
				setting.descEl.createSpan({ text: ' for the details about these variables.' });
			});
		this.addTextSetting('newFileTemplatePath', 'Leave blank not to use a template')
			.setName('Template file path')
			.then(async (setting) => {
				await this.renderMarkdown([
					'You can leave this blank if you don\'t want to use a template.',
					'You can use `file`, `folder`, `app`, and other global variables such as `moment`.',
				], setting.descEl);
				setting.descEl.createSpan({ text: 'See ' });
				setting.descEl.appendChild(this.createLinkToHeading('template', 'above'));
				setting.descEl.createSpan({ text: ' for the details about these variables.' });
				await this.renderMarkdown([
					'You can also include [Templater](obsidian://show-plugin?id=templater-obsidian) syntaxes in the template.',
					'In that case, make sure the "Trigger templater on new file creation" option is enabled in the Templater settings.',
					'',
					'Example:',
					'```',
					'---',
					`${this.plugin.settings.proxyMDProperty}: "[[{{ file.path }}|{{ file.basename }}]]"`,
					'---',
					'<%* const title = await tp.system.prompt("Type note tile") -%>',
					'<%* await tp.file.rename(title) %>',
					'```',
				], setting.descEl);

				const inputEl = (setting.components[0] as TextComponent).inputEl;
				new FuzzyMarkdownFileSuggest(this.app, inputEl)
					.onSelect(({ item: file }) => {
						this.plugin.settings.newFileTemplatePath = file.path;
						this.plugin.saveSettings();
					});
			});


		this.addHeading('PDF Annotations', 'annot', 'lucide-message-square');
		this.addToggleSetting('annotationPopupDrag')
			.setName('Drag & drop annotation popup to insert a link to the annotation')
			.setDesc('Note that turning on this option disables text selection in the annotation popup (e.g. modified date, author, etc).');
		this.addToggleSetting('renderMarkdownInStickyNote')
			.setName('Render markdown in annotation popups when the annotation has text contents');
		if (this.plugin.settings.enablePDFEdit) {
			this.addSliderSetting('writeHighlightToFileOpacity', 0, 1, 0.01)
				.setName('Highlight opacity');
			this.addToggleSetting('defaultWriteFileToggle')
				.setName('Write highlight to file by default')
				.setDesc('You can turn this on and off with the toggle button in the PDF viewer toolbar.');
			this.addToggleSetting('syncWriteFileToggle')
				.setName('Share the same toggle state among all PDF viewers')
				.setDesc('If disabled, you can specify whether to write highlights to files for each PDF viewer.');
			if (this.plugin.settings.syncWriteFileToggle) {
				this.addToggleSetting('syncDefaultWriteFileToggle')
					.setName('Share the state with newly opened PDF viewers as well')
			}
			this.addToggleSetting('enableAnnotationContentEdit', () => this.redisplay())
				.setName('Enable editing annotation contents')
				.setDesc('If enabled, you can edit the text contents of annotations embedded in PDF files by clicking the "Edit" button in the annotation popup.');
			this.addToggleSetting('enableAnnotationDeletion', () => this.redisplay())
				.setName('Enable annotation deletion')
				.setDesc('If enabled, you can delete annotations embedded in PDF files by clicking the "Delete" button in the annotation popup.');
			if (this.plugin.settings.enableAnnotationDeletion) {
				this.addToggleSetting('warnEveryAnnotationDelete', () => this.redisplay())
					.setName('Always warn when deleting an annotation');
				if (!this.plugin.settings.warnEveryAnnotationDelete) {
					this.addToggleSetting('warnBacklinkedAnnotationDelete')
						.setName('Warn when deleting an annotation with backlinks');
				}
			}
		}


		this.addHeading('PDF internal links', 'pdf-link', 'link')
			.setDesc('Make it easier to work with internal links embedded in PDF files.');
		this.addToggleSetting('clickPDFInternalLinkWithModifierKey')
			.then((setting) => {
				this.renderMarkdown(
					'Use [modifier keys](https://help.obsidian.md/User+interface/Tabs#Open+a+link) to open PDF internal links in various ways',
					setting.nameEl
				)
			})
			.then((setting) => {
				if (!noModKey) setting.setDesc(`You may want to turn this off to avoid conflicts with ${hoverCmd}.`);
				setting.descEl.appendText('Reopen the tabs or reload the app after changing this option.');
			});
		this.addToggleSetting('enableHoverPDFInternalLink', () => this.redisplay())
			.setName(`Show a popover preview of PDF internal links by ${hoverCmd}`);
		this.addToggleSetting('recordPDFInternalLinkHistory')
			.setName('Enable history navigation for PDF internal links')
			.setDesc('When enabled, clicking the "navigate back" (left arrow) button will take you back to the page you were originally viewing before clicking on an internal link in the PDF file.');
		this.addSetting()
			.setName('Copy PDF link as Obsidian link')
			.setDesc('(Requires custom right-click menu enabled) In the PDF viewer, right-click a PDF-embedded link and then click "Copy PDF link as Obsidian link". It will copy the PDF link as an Obsidian link that you can paste into markdown files. Clicking the pasted link will take you to the same destination as the original PDF link.');
		this.addSetting()
			.setName('"Copy link to current page view" command')
			.setDesc('Running this command while viewing a PDF file will copy a link, clicking which will open the PDF file at the current scroll position and zoom level.');
		this.addSetting()
			.setName('Paste copied link to a text selection in a PDF file')
			.setDesc('(Requires custom right-click menu & PDF editing enabled) After copying a link by the above actions, you can "paste" it to a selection in PDF to create a PDF internal link. To do this, right-click the selection and click "Paste copied link to selection".');
		if (this.plugin.settings.replaceContextMenu && this.plugin.settings.enablePDFEdit) {
			this.addToggleSetting('pdfLinkBorder', () => this.redisplay())
				.setName('Draw borders around internal links')
				.setDesc('Specify whether PDF internal links that you create by "Paste copied link to selection" should be surrounded by borders.');
			if (this.plugin.settings.pdfLinkBorder) {
				this.addColorPickerSetting('pdfLinkColor')
					.setName('Border color of internal links')
					.setDesc('Specify the border color of PDF internal links that you create by "Paste copied link to selection".');
			}
		}


		this.addHeading('Citations in PDF (experimental)', 'citation', 'lucide-graduation-cap')
			.then((setting) => {
				this.renderMarkdown([
					'Enjoy supercharged experiences of working with citations in PDF files, just like in [Google Scholar\'s PDF viewer](https://scholar.googleblog.com/2024/03/supercharge-your-pdf-reading-follow.html).'
				], setting.descEl);
			});
		{
			this.addDropdownSetting('actionOnCitationHover', ACTION_ON_CITATION_HOVER, () => toggler())
				.setName(`${capitalize(hoverCmd)} on a citation link to show...`)
				.then((setting) => {
					this.renderMarkdown([
						`- **${ACTION_ON_CITATION_HOVER['pdf-plus-bib-popover']}**: ` + ' Recommended. It works without any additional stuff, but you can further boost the visibility by installing [AnyStyle](https://github.com/inukshuk/anystyle) (desktop only).',
						`- **${ACTION_ON_CITATION_HOVER['google-scholar-popover']}**: ` + ' Requires [Surfing](obsidian://show-plugin?id=surfing) ver. 0.9.6 or higher enabled. Be careful not to exceed the rate limit of Google Scholar.',
					], setting.descEl);
				});
			const toggler = this.getVisibilityToggler(
				this.addTextSetting('anystylePath')
					.setName('AnyStyle path')
					.then((setting) => {
						(setting.components[0] as TextComponent).inputEl.size = 35;
						this.renderMarkdown([
							'The path to the [AnyStyle](https://github.com/inukshuk/anystyle) executable. ',
							'PDF++ extracts the bibliography text from the PDF file for each citation link, and use AnyStyle to convert the extracted text into a structured metadata.',
							'It works just fine without AnyStyle, but you can further boost the visibility by installing it.',
						], setting.descEl);
					}),
				() => Platform.isDesktopApp && this.plugin.settings.actionOnCitationHover === 'pdf-plus-bib-popover'
			);
		}



		this.addHeading('External links in PDF', 'pdf-external-link', 'external-link')
			.setDesc('Make it easier to work with external links embedded in PDF files.');
		this.addToggleSetting('popoverPreviewOnExternalLinkHover')
			.setName(`Show a popover preview of external links by ${hoverCmd}`)
			.then((setting) => {
				this.renderMarkdown([
					'Requires [Surfing](obsidian://show-plugin?id=surfing) ver. 0.9.6 or higher enabled.',
				], setting.descEl);
			});


		this.addHeading('PDF sidebar', 'sidebar', 'sidebar-left')
			.setDesc('General settings for the PDF sidebar. The options specific to the outline and thumbnails are located in the corresponding sections below.');
		this.addToggleSetting('autoHidePDFSidebar')
			.setName('Click on PDF content to hide sidebar')
			.setDesc('Requires reopening the tabs after changing this option.');


		this.addHeading('PDF outline (table of contents)', 'outline', 'lucide-list')
			.setDesc('Power up the outline view of the built-in PDF viewer: add, rename, or delete items via the right-click menu and the "Add to outline" command, drag & drop items to insert a section link, and more.');
		this.addToggleSetting('clickOutlineItemWithModifierKey')
			.then((setting) => {
				this.renderMarkdown(
					'Click PDF outline with [modifier keys](https://help.obsidian.md/User+interface/Tabs#Open+a+link) to open target section in various ways',
					setting.nameEl
				)
			})
			.then((setting) => {
				if (!noModKey) setting.setDesc(`You may want to turn this off to avoid conflicts with ${hoverCmd}.`);
				setting.descEl.appendText('Reopen the tabs or reload the app after changing this option.');
			});
		this.addToggleSetting('popoverPreviewOnOutlineHover')
			.setName(`Show popover preview by hover${noModKey ? '' : ('+' + getModifierNameInPlatform('Mod').toLowerCase())} `)
			.setDesc('Reopen the tabs or reload the app after changing this option.');
		this.addToggleSetting('recordHistoryOnOutlineClick')
			.setName('Record to history when clicking an outline item')
			.setDesc('Reopen the tabs or reload the app after changing this option.');
		this.addToggleSetting('outlineContextMenu')
			.setName('Replace the built-in right-click menu in the outline with a custom one')
			.setDesc('This enables you to insert a section link with a custom format by right-clicking an item in the outline. Moreover, you will be able to add, rename, or delete outline items if PDF modification is enabled.')
		this.addToggleSetting('outlineDrag')
			.setName('Drag & drop outline item to insert link to section')
			.setDesc('Grab an item in the outline and drop it to a markdown file to insert a section link. Changing this option requires reopening the tabs or reloading the app.');
		if (this.plugin.settings.outlineContextMenu || this.plugin.settings.outlineDrag) {
			this.addTextSetting('outlineLinkDisplayTextFormat')
				.setName('Display text format')
				.then((setting) => {
					const text = setting.components[0] as TextComponent;
					text.inputEl.size = 30;
				});
			this.addTextAreaSetting('outlineLinkCopyFormat')
				.setName('Link copy format')
				.then((setting) => {
					const textarea = setting.components[0] as TextAreaComponent;
					textarea.inputEl.rows = 3;
					textarea.inputEl.cols = 30;
				});
		}
		this.addHeading('Copy outline as markdown', 'outline-copy')
			.setDesc('You can copy PDF outline as a markdown list or headings using the commands "Copy outline as markdown list" and "Copy outline as markdown headings".');
		this.addTextSetting('copyOutlineAsListDisplayTextFormat')
			.setName('List: display text format')
			.then((setting) => {
				const text = setting.components[0] as TextComponent;
				text.inputEl.size = 30;
			});
		this.addTextAreaSetting('copyOutlineAsListFormat')
			.setName('List: link copy format')
			.setDesc('You don\'t need to include leading hyphens in the template.')
			.then((setting) => {
				const textarea = setting.components[0] as TextAreaComponent;
				textarea.inputEl.rows = 3;
				textarea.inputEl.cols = 30;
			});
		this.addTextSetting('copyOutlineAsHeadingsDisplayTextFormat')
			.setName('Headings: display text format')
			.then((setting) => {
				const text = setting.components[0] as TextComponent;
				text.inputEl.size = 30;
			});
		this.addTextAreaSetting('copyOutlineAsHeadingsFormat')
			.setName('Headings: link copy format')
			.setDesc('You don\'t need to include leading hashes in the template.')
			.then((setting) => {
				const textarea = setting.components[0] as TextAreaComponent;
				textarea.inputEl.rows = 3;
				textarea.inputEl.cols = 30;
			});
		this.addSliderSetting('copyOutlineAsHeadingsMinLevel', 1, 6, 1)
			.setName('Headings: minimum level')
			.setDesc('The copied headings will start at this level.');


		this.addHeading('PDF thumbnails', 'thumbnail', 'lucide-gallery-thumbnails')
		this.addToggleSetting('clickThumbnailWithModifierKey')
			.then((setting) => {
				this.renderMarkdown(
					'Click PDF thumbnails with [modifier keys](https://help.obsidian.md/User+interface/Tabs#Open+a+link) to open target page in various ways',
					setting.nameEl
				)
			})
			.then((setting) => {
				if (!noModKey) setting.setDesc(`You may want to turn this off to avoid conflicts with ${hoverCmd}.`);
				setting.descEl.appendText('Reopen the tabs or reload the app after changing this option.');
			});
		this.addToggleSetting('popoverPreviewOnThumbnailHover')
			.setName(`Show popover preview by hover${noModKey ? '' : ('+' + getModifierNameInPlatform('Mod').toLowerCase())} `)
			.setDesc('Reopen the tabs or reload the app after changing this option.');
		this.addToggleSetting('recordHistoryOnThumbnailClick')
			.setName('Record to history when clicking a thumbnail')
			.setDesc('Reopen the tabs or reload the app after changing this option.');
		this.addToggleSetting('thumbnailContextMenu')
			.setName('Replace the built-in right-click menu in thumbnails with a custom one')
			.setDesc('This enables you to copy a page link with a custom display text format specified in the PDF toolbar by right-clicking a thumbnail. Moreover, you will be able to insert, delete, extract pages if PDF modification is enabled.');
		this.addToggleSetting('thumbnailDrag')
			.setName('Drag & drop PDF thumbnail to insert link to section')
			.then((setting) => {
				this.renderMarkdown([
					'Grab a thumbnail image and drop it to a markdown file to insert a page link. Changing this option requires reopening the tabs or reloading the app.',
					'',
					'Note: When disabled, drag-and-drop will cause the thumbnail image to be paste as a data url, which is seemingly Obsidian\'s bug.'
				], setting.descEl);
			});
		if (this.plugin.settings.thumbnailContextMenu || this.plugin.settings.thumbnailDrag) {
			this.addTextSetting('thumbnailLinkDisplayTextFormat')
				.setName('Display text format')
				.then((setting) => {
					const text = setting.components[0] as TextComponent;
					text.inputEl.size = 30;
				});
			this.addTextAreaSetting('thumbnailLinkCopyFormat')
				.setName('Link copy format')
				.then((setting) => {
					const textarea = setting.components[0] as TextAreaComponent;
					textarea.inputEl.rows = 3;
					textarea.inputEl.cols = 30;
				});
		}


		this.addHeading('PDF page composer (experimental)', 'composer', 'lucide-blocks')
			.then((setting) => {
				this.renderMarkdown([
					`Add, insert, delete or extract PDF pages via commands and **automatically update all the related links in the entire vault**. The "Editing PDF files directly" option has to be enabled to use these features.`
				], setting.descEl);
			});
		this.addToggleSetting('warnEveryPageDelete', () => this.redisplay())
			.setName('Always warn when deleting a page');
		if (!this.plugin.settings.warnEveryPageDelete) {
			this.addToggleSetting('warnBacklinkedPageDelete')
				.setName('Warn when deleting a page with backlinks');
		}
		this.addToggleSetting('extractPageInPlace')
			.setName('Remove the extracted pages from the original PDF by default')
		this.addToggleSetting('askExtractPageInPlace')
			.setName('Ask whether to remove the extracted pages from the original PDF before extracting')
		this.addToggleSetting('openAfterExtractPages', () => this.redisplay())
			.setName('Open extracted PDF file')
			.setDesc('If enabled, the newly created PDF file will be opened after running the commands "Extract this page to a new file" or "Divide this PDF into two files at this page".');
		if (this.plugin.settings.openAfterExtractPages) {
			this.addDropdownSetting('howToOpenExtractedPDF', PANE_TYPE)
				.setName('How to open');
		}

		this.addHeading('Page labels', 'page-label')
			.then((setting) => {
				this.renderMarkdown([
					'Each page in a PDF document can be assigned a ***page label***, which can be different from the page indices.',
					'For example, a book might have a preface numbered as "i", "ii", "iii", ... and the main content numbered as "1", "2", "3", ...',
					'',
					'PDF++ allows you to choose whether page labels should be kept unchanged or updated when inserting/removing/extracting pages. [Learn more](https://github.com/RyotaUshio/obsidian-pdf-plus/wiki/Page-labels)',
					'',
					'You can also modify page labels directly using the command "Edit page labels".'
				], setting.descEl);
			});
		this.addDropdownSetting('pageLabelUpdateWhenInsertPage', PAGE_LABEL_UPDATE_METHODS)
			.setName('Insert: default page label processing')
			.setDesc('Applies to the commands "Insert page before/after this page".');
		this.addToggleSetting('askPageLabelUpdateWhenInsertPage')
			.setName('Insert: ask whether to update');
		this.addDropdownSetting('pageLabelUpdateWhenDeletePage', PAGE_LABEL_UPDATE_METHODS)
			.setName('Delete: default page label processing')
			.setDesc('Applies to the command "Delete this page".');
		this.addToggleSetting('askPageLabelUpdateWhenDeletePage')
			.setName('Delete: ask whether to update');
		this.addDropdownSetting('pageLabelUpdateWhenExtractPage', PAGE_LABEL_UPDATE_METHODS)
			.setName('Extract: default page label processing')
			.setDesc('Applies to the commands "Extract this page to a new file" and "Divide this PDF into two files at this page".');
		this.addToggleSetting('askPageLabelUpdateWhenExtractPage')
			.setName('Extract: ask whether to update');


		// this.addHeading('Canvas', 'canvas', 'lucide-layout-dashboard')
		// 	.setDesc('Embed PDF files in Canvas and create a card from text selection or annotation using the "Create canvas card from selection or annotation" command.')
		// this.addToggleSetting('canvasContextMenu')
		// 	.setName('Show "Create Canvas card from ..." in the right-click menu in Canvas')
		// 	.setDesc('Turn this off if you don\'t want to clutter the right-click menu. You can always use the "Create canvas card from selection or annotation" command via a hotkey.');


		this.addHeading('Opening links to PDF files', 'open-link', 'lucide-book-open');
		this.addToggleSetting('alwaysRecordHistory')
			.setName('Always record to history when opening PDF links')
			.setDesc('By default, the history is recorded only when you open a link to a different PDF file. If enabled, the history will be recorded even when you open a link to the same PDF file as the current one, and you will be able to go back and forth the history by clicking the left/right arrow buttons even within a single PDF file.');
		this.addToggleSetting('singleTabForSinglePDF', () => this.redisplay())
			.setName('Don\'t open a single PDF file in multiple tabs')
			.then((setting) => this.renderMarkdown(
				`When opening a link to a PDF file without pressing any [modifier keys](https://help.obsidian.md/User+interface/Use+tabs+in+Obsidian#Open+a+link), a new tab will not be opened if the same file has already been already opened in another tab. Useful for annotating PDFs using a side-by-side view ("Split right"), displaying a PDF in one side and a markdown file in another.`,
				setting.descEl
			));
		if (this.plugin.settings.singleTabForSinglePDF) {
			this.addToggleSetting('dontActivateAfterOpenPDF')
				.setName('Don\'t move focus to PDF viewer after opening a PDF link')
				.setDesc('This option will be ignored when you open a PDF link in a tab in the same split as the PDF viewer.')
			this.addToggleSetting('highlightExistingTab', () => this.redisplay())
				.setName('When opening a link to an already opened PDF file, highlight the tab');
			if (this.plugin.settings.highlightExistingTab) {
				this.addSliderSetting('existingTabHighlightOpacity', 0, 1, 0.01)
					.setName('Highlight opacity of an existing tab')
				this.addSliderSetting('existingTabHighlightDuration', 0.1, 10, 0.05)
					.setName('Highlight duration of an existing tab (sec)')
			}
			this.addToggleSetting('dontFitWidthWhenOpenPDFLink', () => this.redisplay())
				.setName('Preserve the current zoom level when opening a link to an already opened PDF file')
				.setDesc('When you open a link to a PDF file that\'s already opened, Obsidian\'s default behavior causes the zoom level to be reset to fit the width of the PDF file to the viewer. If enabled, the current zoom level will be preserved.');
			if (this.plugin.settings.dontFitWidthWhenOpenPDFLink) {
				this.addToggleSetting('preserveCurrentLeftOffsetWhenOpenPDFLink')
					.setName('Preserve the current horizontal scroll position');
			}

		}
		this.addDropdownSetting('paneTypeForFirstPDFLeaf', PANE_TYPE)
			.setName(`How to open PDF links when there is no open PDF file`)
			.then((setting) => {
				this.renderMarkdown(
					'This option will be ignored when you press [modifier keys](https://help.obsidian.md/User+interface/Use+tabs+in+Obsidian#Open+a+link) to explicitly specify how to open the link.',
					setting.descEl
				);
			});
		this.addToggleSetting('openLinkNextToExistingPDFTab')
			.setName('Open PDF links next to an existing PDF tab')
			.then((setting) => this.renderMarkdown(
				'If there is a PDF file opened in a tab, clicking a PDF link will first create a new tab next to it and then open the target PDF file in the created tab. This is especially useful when you are spliting the workspace vertically or horizontally and want PDF files to be always opened in one side. This option will be ignored when you press [modifier keys](https://help.obsidian.md/User+interface/Use+tabs+in+Obsidian#Open+a+link) to explicitly specify how to open the link.',
				setting.descEl
			));
		this.addToggleSetting('hoverPDFLinkToOpen')
			.setName('Open PDF link instead of showing popover preview when target PDF is already opened')
			.setDesc(`Press ${getModifierNameInPlatform('Mod').toLowerCase()} while hovering a PDF link to actually open it if the target PDF is already opened in another tab.`)
		this.addSetting()
			.setName('Open PDF links with an external app')
			.setDesc(createFragment((el) => {
				el.appendText('See the ');
				el.appendChild(this.createLinkToHeading('external-app'));
				el.appendText(' section for the details.');
			}));


		this.addSetting()
			.setName('Clear highlights after a certain amount of time')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.highlightDuration > 0)
					.onChange(async (value) => {
						this.plugin.settings.highlightDuration = value
							? (this.plugin.settings.highlightDuration > 0
								? this.plugin.settings.highlightDuration
								: 1)
							: 0;
						await this.plugin.saveSettings();
						this.redisplay();
					});
			});
		if (this.plugin.settings.highlightDuration > 0) {
			this.addSliderSetting('highlightDuration', 0.1, 10, 0.05)
				.setName('Highlight duration (sec)');
		}
		this.addToggleSetting('ignoreHeightParamInPopoverPreview')
			.setName('Ignore "height" parameter in popover preview')
			.setDesc('Obsidian lets you specify the height of a PDF embed by appending "&height=..." to a link, and this also applies to popover previews. Enable this option if you want to ignore the height parameter in popover previews.')


		this.addHeading('Embedding PDF files', 'embed', 'picture-in-picture-2');
		this.addToggleSetting('dblclickEmbedToOpenLink', () => this.plugin.loadStyle())
			.setName('Double click PDF embeds to open links')
			.setDesc('Double-clicking a PDF embed will open the embedded file.');
		this.addToggleSetting('trimSelectionEmbed', () => this.redisplay())
			.setName('Trim selection/annotation embeds')
			.then((setting) => {
				this.renderMarkdown([
					'<span style="color: var(--text-warning);">(Deprecated in favor of the <a href="https://ryotaushio.github.io/obsidian-pdf-plus/embedding-rectangular-selections.html" class="external-link" target="_blank" rel="noopener">rectangular selection embed feature</a> introduced in PDF++ 0.36.0)</span>',
					'When embedding a selection or an annotation from a PDF file, only the target selection/annotation and its surroundings are displayed rather than the entire page.'
				], setting.descEl);
			});
		if (this.plugin.settings.trimSelectionEmbed) {
			this.addSliderSetting('embedMargin', 0, 200, 1)
				.setName('Selection/annotation embeds margin (px)');
		}
		this.addToggleSetting('noSidebarInEmbed')
			.setName('Hide sidebar in PDF embeds embeds or PDF popover previews by default');
		this.addToggleSetting('noSpreadModeInEmbed')
			.setName('Don\'t display PDF embeds or PDF popover previews in "two page" layout')
			.setDesc('Regardless of the "two page" layout setting in existing PDF viewer, PDF embeds and PDF popover previews will be always displayed in "single page" layout. You can still turn it on for each embed by clicking the "two page" button in the toolbar, if shown.')
		this.addToggleSetting('noTextHighlightsInEmbed')
			.setName('Don\'t highlight text in a text selection embeds');
		this.addToggleSetting('noAnnotationHighlightsInEmbed')
			.setName('Don\'t highlight annotations in an annotation embeds');
		this.addToggleSetting('persistentTextHighlightsInEmbed')
			.setName('Don\'t clear highlights in a text selection embeds');
		this.addToggleSetting('persistentAnnotationHighlightsInEmbed')
			.setName('Don\'t clear highlights in an annotation embeds');
		this.addToggleSetting('embedUnscrollable')
			.setName('Make PDF embeds with a page specified unscrollable');


		this.addHeading('Backlinks pane for PDF files', 'backlink-view', 'links-coming-in')
			.then((setting) => this.renderMarkdown(
				`Improve the built-in [backlinks pane](https://help.obsidian.md/Plugins/Backlinks) for better PDF experience.`,
				setting.descEl
			));
		this.addToggleSetting('filterBacklinksByPageDefault')
			.setName('Filter backlinks by page by default')
			.setDesc('You can toggle this on and off with the "Show only backlinks in the current page" button at the top right of the backlinks pane.')
		this.addToggleSetting('showBacklinkToPage')
			.setName('Show backlinks to the entire page')
			.setDesc('If turned off, only backlinks to specific text selections, annotations or locations will be shown when filtering the backlinks page by page.')
		this.addToggleSetting('highlightBacklinksPane')
			.setName('Hover sync (PDF viewer → Backlinks pane)')
			.setDesc('Hovering your mouse over highlighted text or annotation will also highlight the corresponding item in the backlink pane.');
		this.addToggleSetting('highlightOnHoverBacklinkPane')
			.setName('Hover sync (Backlinks pane → PDF viewer)')
			.setDesc('In the backlinks pane, hover your mouse over an backlink item to highlight the corresponding text or annotation in the PDF viewer. This option requires reopening or switching tabs to take effect.')
		if (this.plugin.settings.highlightOnHoverBacklinkPane) {
			this.addDropdownSetting(
				'backlinkHoverColor',
				['', ...Object.keys(this.plugin.settings.colors)],
				(option) => option || 'PDF++ default',
				() => this.plugin.loadStyle()
			)
				.setName('Highlight color for hover sync (Backlinks pane → PDF viewer)')
				.setDesc('To add a new color, click the "+" button in the "highlight colors" setting above.');
		}


		this.addHeading('Search from links', 'search-link', 'lucide-search')
			.then((setting) => {
				this.renderMarkdown([
					'You can trigger full-text search by opening a link to a PDF file with a search query appended, e.g. `[[file.pdf#search=keyword]]`.',
				], setting.descEl);
			});
		this.addToggleSetting('showCopyLinkToSearchInContextMenu')
			.setName('Show "Copy link to search" in the right-click menu')
			.setDesc(createFragment((el) => {
				el.appendText('Requires the ');
				el.appendChild(this.createLinkTo('replaceContextMenu'));
				el.appendText(' option to be enabled.');
			}));
		this.addHeading('Search options', 'search-option')
			.then((setting) => {
				this.renderMarkdown([
					'The behavior of the search links can be customized globally by the following settings. ',
					'Alternatively, you can specify the behavior for each link by including the following query parameters in the link text: ',
					'',
					'- `&case-sensitive=true` or `&case-sensitive=false`',
					'- `&highlight-all=true` or `&highlight-all=false`',
					'- `&match-diacritics=true` or `&match-diacritics=false`',
					'- `&entire-word=true` or `&entire-word=false`',
				], setting.descEl);
			});
		const searchLinkDisplays = {
			'true': 'Yes',
			'false': 'No',
			'default': 'Follow default setting',
		};
		this.addDropdownSetting('searchLinkCaseSensitive', searchLinkDisplays)
			.setName('Case sensitive search');
		this.addDropdownSetting('searchLinkHighlightAll', searchLinkDisplays)
			.setName('Highlight all search results');
		this.addDropdownSetting('searchLinkMatchDiacritics', searchLinkDisplays)
			.setName('Match diacritics');
		this.addDropdownSetting('searchLinkEntireWord', searchLinkDisplays)
			.setName('Match whole word');


		this.addHeading('Integration with external apps (desktop-only)', 'external-app', 'lucide-share');
		this.addToggleSetting('openPDFWithDefaultApp', () => this.redisplay())
			.setName('Open PDF links with an external app')
			.setDesc('Open PDF links with the OS-defined default application for PDF files.')
		if (this.plugin.settings.openPDFWithDefaultApp) {
			this.addToggleSetting('openPDFWithDefaultAppAndObsidian')
				.setName('Open PDF links in Obsidian as well')
				.setDesc('Open the same PDF file both in the default app and Obsidian at the same time.')
		}
		this.addToggleSetting('syncWithDefaultApp')
			.setName('Sync the external app with Obsidian')
			.setDesc('When you focus on a PDF file in Obsidian, the external app will also focus on the same file.')
		this.addToggleSetting('focusObsidianAfterOpenPDFWithDefaultApp')
			.setName('Focus Obsidian after opening a PDF file with an external app')
			.setDesc('Otherwise, the focus will be moved to the external app.');


		this.addHeading('View Sync', 'view-sync', 'lucide-eye')
			.then((setting) => {
				this.renderMarkdown([
					'Integrate more seamlessly with the [View Sync](https://github.com/RyotaUshio/obsidian-view-sync) plugin.'
				], setting.descEl);
			});
		this.addToggleSetting('viewSyncFollowPageNumber', () => this.redisplay())
			.setName('Sync page number');
		if (this.plugin.settings.viewSyncFollowPageNumber) {
			this.addSliderSetting('viewSyncPageDebounceInterval', 0.1, 1, 0.05)
				.setName('Minimum update interval of the View Sync file (sec)');
		}


		this.addHeading('Misc', 'misc', 'lucide-more-horizontal');
		this.addToggleSetting('showStatusInToolbar')
			.setName('Show status in PDF toolbar')
			.setDesc('For example, when you copy a link to a text selection in a PDF file, the status "Link copied" will be displayed in the PDF toolbar.');
		this.addFileLocationSetting(
			'newPDFLocation', (setting) => setting
				.setName('Default location for new PDFs')
				.setDesc('The "Create new PDF" command will create a new PDF file in the location specified here.'),
			'newPDFFolderPath', (setting) => setting
				.setName('Folder to create new PDFs in')
				.setDesc('Newly created PDFs will appear under this folder.')
		);
		this.addToggleSetting('hideReplyAnnotation')
			.setName('Hide reply annotations')
			.then((setting) => {
				this.renderMarkdown([
					'Hide annotations that are replies to other annotations in the PDF viewer.',
					'',
					'This is a temporary fix for the issue that PDF.js (the library Obsidian\'s PDF viewer is based on) does not fulfill the PDF specification in that it renders reply annotations as if a standalone annotation.',
				], setting.descEl);
			});


		this.addHeading('Style settings', 'style-settings', 'lucide-settings-2')
			.setDesc('You can find more options in Style Settings > PDF++.')
			.addButton((button) => {
				button.setButtonText('Open style settings')
					.onClick(() => {
						const styleSettingsTab = this.app.setting.pluginTabs.find((tab) => tab.id === 'obsidian-style-settings');
						if (styleSettingsTab) {
							this.app.setting.openTab(styleSettingsTab);
						} else {
							open('obsidian://show-plugin?id=obsidian-style-settings');
						}
					});
			});


		this.addFundingButton();


		await Promise.all(this.promises);
	}

	async hide() {
		this.plugin.settings.colors = Object.fromEntries(
			Object.entries(this.plugin.settings.colors).filter(([name, color]) => name && isHexString(color))
		);
		if (this.plugin.settings.defaultColor && !(this.plugin.settings.defaultColor in this.plugin.settings.colors)) {
			this.plugin.settings.defaultColor = '';
		}
		if (this.plugin.settings.backlinkHoverColor && !(this.plugin.settings.backlinkHoverColor in this.plugin.settings.colors)) {
			this.plugin.settings.backlinkHoverColor = '';
		}

		this.plugin.settings.copyCommands = this.plugin.settings.copyCommands.filter((command) => command.name && command.template);
		this.plugin.settings.displayTextFormats = this.plugin.settings.displayTextFormats.filter((format) => format.name && format.template);

		// avoid annotations to be not referneceable
		if (this.plugin.settings.enablePDFEdit && !this.plugin.settings.author) {
			this.plugin.settings.enablePDFEdit = false;
			new Notice(`${this.plugin.manifest.name}: Cannot enable writing highlights into PDF files because the "Annotation author" option is empty.`)
		}

		this.plugin.validateAutoFocusAndAutoPasteSettings();

		await this.plugin.saveSettings();

		this.plugin.loadStyle();

		this.promises = [];
		this.component.unload();
	}
}
