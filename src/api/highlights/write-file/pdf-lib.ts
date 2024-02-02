import { TFile } from 'obsidian';
import { PDFDocument, PDFPage, PDFRef, PDFString } from '@cantoo/pdf-lib';
import { Util } from 'annotpdf';

import { PDFPlusAPISubmodule } from 'api/submodule';
import { formatAnnotationID, getBorderRadius } from 'utils';
import { Rect } from 'typings';
import { IPdfIo } from '.';


export class PdfLibIO extends PDFPlusAPISubmodule implements IPdfIo {

    async addHighlightAnnotations(file: TFile, pageNumber: number, rects: Rect[], colorName?: string, contents?: string) {
        return await this.process(file, (pdfDoc) => {
            const page = pdfDoc.getPage(pageNumber - 1);
            const { r, g, b } = this.plugin.domManager.getRgb(colorName);
            const borderRadius = getBorderRadius();
            const geometry = this.api.highlight.geometry;

            // Since pdf-lib does not provide a high-level API to add annotation to a PDF file,
            // we have to interact with some low-level objects.
            // Note that pdf-lib has functions like drawRectangle, but it does not produce referenceable annotations.
            // For the meaning of each entry, refer to the PDF specification:
            // - 12.5.2 "Annotation Dictionaries", 
            // - 12.5.6.2 "Markup Annotations" and 
            // - 12.5.6.10 "Text Markup Annotations".
            const ref = this.addAnnot(page, {
                Subtype: 'Highlight',
                Rect: geometry.mergeRectangles(...rects),
                QuadPoints: geometry.rectsToQuadPoints(rects),
                // For Contents & T, make sure to pass a PDFString, not a raw string!!
                // https://github.com/Hopding/pdf-lib/issues/555#issuecomment-670243166
                Contents: PDFString.of(contents ?? ''),
                M: PDFString.of(Util.convertDateToPDFDate(new Date())),
                T: PDFString.of(this.plugin.settings.author),
                CA: this.plugin.settings.writeHighlightToFileOpacity,
                Border: [borderRadius, borderRadius, 0],
                C: [r / 255, g / 255, b / 255],
            });

            const annotationID = formatAnnotationID(ref.objectNumber, ref.generationNumber);
            return annotationID;
        });
    }

    async process<T>(file: TFile, fn: (pdfDoc: PDFDocument) => T) {
        const buffer = await this.app.vault.readBinary(file);
        const pdfDoc = await PDFDocument.load(buffer);

        const ret = await fn(pdfDoc);

        await this.app.vault.modifyBinary(file, await pdfDoc.save());

        return ret;
    }

    async read<T>(file: TFile, fn: (pdfDoc: PDFDocument) => T) {
        const buffer = await this.app.vault.readBinary(file);
        const pdfDoc = await PDFDocument.load(buffer);
        return await fn(pdfDoc);
    }

    addAnnot(page: PDFPage, annotDict: Record<string, any>): PDFRef {
        const context = page.doc.context;
        const ref = context.register(
            context.obj({
                Type: 'Annot',
                ...annotDict
            })
        );
        page.node.addAnnot(ref);
        // page.node.set(PDFName.of('Annots'), context.obj([...page.node.Annots()?.asArray() ?? [], ref]));
        return ref;
    }
}
