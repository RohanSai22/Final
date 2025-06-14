// =====================================================================================
// FILE PROCESSING SERVICE - COMPLETE IMPLEMENTATION
// Supports PDF, DOCX, DOC, TXT files with robust error handling
// =====================================================================================

import * as pdfjs from "pdfjs-dist";
import mammoth from "mammoth";

// Set up PDF.js worker with fallback
try {
  // Try local worker first
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  console.log(`FileProcessingService: PDF.js workerSrc set to local: ${pdfjs.GlobalWorkerOptions.workerSrc}`);
} catch (error) {
  // Fallback to CDN if local doesn't work
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  console.log(`FileProcessingService: PDF.js workerSrc fallback to CDN: ${pdfjs.GlobalWorkerOptions.workerSrc}`);
}

export interface FileProcessingResult {
  success: boolean;
  content: string;
  metadata: {
    fileName: string;
    fileSize: number;
    fileType: string;
    wordCount: number;
    charCount: number;
  };
  error?: string;
}

class FileProcessingService {
  /**
   * Extract text from any supported file type
   */
  async extractTextFromFile(file: File): Promise<string> {
    try {
      const fileType = this.getFileType(file);

      switch (fileType) {
        case "pdf":
          return await this.extractFromPDF(file);
        case "docx":
          return await this.extractFromDocx(file);
        case "doc":
          return await this.extractFromDoc(file);
        case "txt":
          return await this.extractFromText(file);
        default:
          throw new Error(`Unsupported file type: ${file.type}`);
      }
    } catch (error) {
      console.error("File processing error:", error);
      throw new Error(
        `Failed to process file ${file.name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Process file and return detailed result
   */
  async processFile(file: File): Promise<FileProcessingResult> {
    try {
      const content = await this.extractTextFromFile(file);

      return {
        success: true,
        content,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: this.getFileType(file),
          wordCount: this.countWords(content),
          charCount: content.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        content: "",
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: this.getFileType(file),
          wordCount: 0,
          charCount: 0,
        },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Process multiple files
   */
  async processFiles(files: File[]): Promise<FileProcessingResult[]> {
    const results = await Promise.all(
      files.map((file) => this.processFile(file))
    );
    return results;
  }

  /**
   * Determine file type from file object
   */
  private getFileType(file: File): string {
    const extension = file.name.toLowerCase().split(".").pop() || "";
    const mimeType = file.type.toLowerCase();

    // Check by MIME type first
    if (mimeType === "application/pdf") return "pdf";
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
      return "docx";
    if (mimeType === "application/msword") return "doc";
    if (mimeType === "text/plain") return "txt";

    // Fallback to extension
    switch (extension) {
      case "pdf":
        return "pdf";
      case "docx":
        return "docx";
      case "doc":
        return "doc";
      case "txt":
        return "txt";
      default:
        return "unknown";
    }
  }

  /**
   * Extract text from PDF files
   */
  private async extractFromPDF(file: File): Promise<string> {
    try {
      console.log(`FileProcessingService: Processing PDF file: ${file.name}, Size: ${file.size} bytes`);
      
      // Verify worker is set
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        throw new Error("PDF worker not configured");
      }
      
      const arrayBuffer = await file.arrayBuffer();
      console.log(`FileProcessingService: PDF arrayBuffer created, size: ${arrayBuffer.byteLength} bytes`);
      
      const loadingTask = pdfjs.getDocument({ 
        data: arrayBuffer,
        verbosity: 0 // Reduce console noise
      });
      
      const pdfDoc = await loadingTask.promise;
      console.log(`FileProcessingService: PDF loaded successfully, pages: ${pdfDoc.numPages}`);

      let fullText = "";

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();

          const pageText = textContent.items
            .map((item: any) => {
              if ("str" in item) {
                return item.str;
              }
              return "";
            })
            .join(" ");

          fullText += pageText + "\n";
          
          // Log progress for large PDFs
          if (pageNum % 10 === 0) {
            console.log(`FileProcessingService: Processed ${pageNum}/${pdfDoc.numPages} pages`);
          }
        } catch (pageError) {
          console.warn(`FileProcessingService: Error processing page ${pageNum}:`, pageError);
          // Continue with other pages
        }
      }

      const cleanedText = this.cleanText(fullText);
      console.log(`FileProcessingService: PDF extraction complete. Extracted ${cleanedText.length} characters`);
      
      if (cleanedText.length === 0) {
        throw new Error("No text content found in PDF - the file might be image-based or corrupted");
      }
      
      return cleanedText;
    } catch (error) {
      console.error("PDF extraction error:", error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes("Invalid PDF")) {
          throw new Error("Invalid PDF file format. Please ensure the file is not corrupted.");
        } else if (error.message.includes("worker")) {
          throw new Error("PDF processing setup error. Please try again or use a different file format.");
        } else if (error.message.includes("No text content")) {
          throw error; // Pass through our specific message
        }
      }
      
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from DOCX files
   */
  private async extractFromDocx(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });

      if (result.messages.length > 0) {
        console.warn("DOCX conversion warnings:", result.messages);
      }

      return this.cleanText(result.value);
    } catch (error) {
      console.error("DOCX extraction error:", error);
      throw new Error("Failed to extract text from DOCX");
    }
  }

  /**
   * Extract text from legacy DOC files
   */
  private async extractFromDoc(file: File): Promise<string> {
    try {
      // Try to process as DOCX first (sometimes works for newer DOC files)
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return this.cleanText(result.value);
    } catch (error) {
      console.error("DOC extraction error:", error);
      // More specific error message as requested
      throw new Error(
        "Failed to extract text from .doc file. Please try converting it to DOCX or PDF, or ensure it's a compatible Word document."
      );
    }
  }

  /**
   * Extract text from plain text files
   */
  private async extractFromText(file: File): Promise<string> {
    try {
      const text = await file.text();
      return this.cleanText(text);
    } catch (error) {
      console.error("Text file extraction error:", error);
      throw new Error("Failed to read text file");
    }
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanText(text: string): string {
    return (
      text
        // Remove excessive whitespace
        .replace(/\s+/g, " ")
        // Remove special characters that might cause issues
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        // Normalize line breaks
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        // Remove excessive line breaks
        .replace(/\n{3,}/g, "\n\n")
        // Trim whitespace
        .trim()
    );
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Validate file size and type
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 100 * 1024 * 1024; // 100MB limit
    const supportedTypes = ["pdf", "docx", "doc", "txt"];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: "File size exceeds 100MB limit",
      };
    }

    const fileType = this.getFileType(file);
    if (!supportedTypes.includes(fileType)) {
      return {
        valid: false,
        error: `Unsupported file type: ${fileType}. Supported types: ${supportedTypes.join(
          ", "
        )}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get file processing statistics
   */
  getProcessingStats(results: FileProcessingResult[]): {
    totalFiles: number;
    successCount: number;
    failureCount: number;
    totalWords: number;
    totalCharacters: number;
    averageFileSize: number;
  } {
    const successfulResults = results.filter((r) => r.success);

    return {
      totalFiles: results.length,
      successCount: successfulResults.length,
      failureCount: results.length - successfulResults.length,
      totalWords: successfulResults.reduce(
        (sum, r) => sum + r.metadata.wordCount,
        0
      ),
      totalCharacters: successfulResults.reduce(
        (sum, r) => sum + r.metadata.charCount,
        0
      ),
      averageFileSize:
        results.length > 0
          ? results.reduce((sum, r) => sum + r.metadata.fileSize, 0) /
            results.length
          : 0,
    };
  }

  /**
   * Check if file type is supported
   */
  isFileTypeSupported(file: File): boolean {
    const supportedTypes = ["pdf", "docx", "doc", "txt"];
    const fileType = this.getFileType(file);
    return supportedTypes.includes(fileType);
  }

  /**
   * Get human-readable file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

// =====================================================================================
// EXPORT SINGLETON INSTANCE
// =====================================================================================

export const fileProcessingService = new FileProcessingService();
