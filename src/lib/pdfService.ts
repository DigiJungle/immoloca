import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.entry';

// Configurer le worker PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsLib.DefaultWorkerMessageHandler;

export async function convertPDFToImage(file: File): Promise<string> {
  try {
    // Lire le fichier PDF
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    
    // On ne prend que la première page
    const page = await pdf.getPage(1);
    
    // Définir une échelle raisonnable pour la conversion
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    
    // Créer un canvas pour le rendu
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Cannot create canvas context');
    }
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Set white background
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    // Convert canvas to base64 image
    const imageData = canvas.toDataURL('image/jpeg', 0.85);
    
    // Cleanup
    canvas.remove();
    pdf.destroy();
    
    return imageData;
  } catch (error) {
    console.error('Error converting PDF to image:', error);
    throw new Error('Failed to convert PDF to image');
  }
}