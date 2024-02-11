import { CanvasData } from 'obsidian/canvas';

// wikilink can be [[wikilink]] or [[wikilink|display text]]. I want to extract the link text and the display text
const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

export const parseCanvas = (data: CanvasData) => {
    const result: Record<string, { linktext: string, display: string}[]> = {};
    
    for (const node of data.nodes) {
        if (node.type !== 'text') continue;

        // parse node.text to obtain an array of all wikilinks and markdown links in it
        // together with their line numbers, not offset
        const links = [];
        let match;
        while ((match = wikilinkRegex.exec(node.text)) !== null) {
            links.push({ linktext: match[1], display: match[2] });
        }
        while ((match = markdownLinkRegex.exec(node.text)) !== null) {
            links.push({ linktext: match[2], display: match[1] });
        }

        result[node.id] = links;
    }

    return result;
};
