// =====================================================================================
// FILE PROCESSING SERVICE - PDF, DOCX, DOC, TXT Support
// Advanced file extraction with chunking and validation
// =====================================================================================

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface ProcessedFile {
  name: string;
  size: number;
  type: string;
  content: string;
  extractedText?: string;
  wordCount: number;
  success: boolean;
  error?: string;
}

export class FileProcessingService {
  /**
   * Process uploaded files and extract text content
   */
  async processFiles(files: File[]): Promise<ProcessedFile[]> {
    const processedFiles: ProcessedFile[] = [];

    for (const file of files) {
      try {
        const processed = await this.processFile(file);
        processedFiles.push(processed);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        processedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          content: '',
          wordCount: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return processedFiles;
  }

  /**
   * Process a single file based on its type
   */
  private async processFile(file: File): Promise<ProcessedFile> {
    let content = '';
    let extractedText = '';

    if (file.type === 'application/pdf') {
      content = await this.extractPDFText(file);
      extractedText = content;
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      content = await this.extractDOCXText(file);
      extractedText = content;
    } else if (file.type === 'application/msword') {
      // Legacy DOC format - try as text
      content = await this.extractTextFile(file);
      extractedText = content;
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      content = await this.extractTextFile(file);
      extractedText = content;
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    const wordCount = this.countWords(content);

    return {
      name: file.name,
      size: file.size,
      type: file.type,
      content,
      extractedText,
      wordCount,
      success: true,
    };
  }

  /**
   * Extract text from PDF files using PDF.js
   */
  private async extractPDFText(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        text += pageText + '\n';
      }

      return text.trim();
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from DOCX files using mammoth
   */
  private async extractDOCXText(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value.trim();
    } catch (error) {
      console.error('DOCX extraction error:', error);
      throw new Error('Failed to extract text from DOCX');
    }
  }

  /**
   * Extract text from plain text files
   */
  private async extractTextFile(file: File): Promise<string> {
    try {
      const text = await file.text();
      return text.trim();
    } catch (error) {
      console.error('Text file extraction error:', error);
      throw new Error('Failed to extract text from file');
    }
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Validate file types
   */
  isSupportedFileType(file: File): boolean {
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];

    return (
      supportedTypes.includes(file.type) ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.doc') ||
      file.name.endsWith('.docx') ||
      file.name.endsWith('.pdf')
    );
  }

  /**
   * Get file type description
   */
  getFileTypeDescription(file: File): string {
    if (file.type === 'application/pdf') return 'PDF Document';
    if (
      file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
      return 'Word Document';
    if (file.type === 'application/msword') return 'Word Document (Legacy)';
    if (file.type === 'text/plain' || file.name.endsWith('.txt'))
      return 'Text File';
    return 'Unknown File Type';
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate file size
   */
  isValidFileSize(file: File, maxSizeMB: number = 10): boolean {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
  }
}

// Export singleton instance
export const fileProcessingService = new FileProcessingService();
