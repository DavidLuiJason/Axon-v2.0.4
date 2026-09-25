/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { RegisteredInterface, interfaceRegistry } from './interfaceRegistry';
import { 
  saveCapture, 
  getCapture, 
  getAllCaptures, 
  getStoredCheckpoint 
} from './captureStorage';

export type InterfaceStatus = 'queued' | 'capturing' | 'done' | 'failed' | 'pending';

export interface InterfaceCaptureState {
  item: RegisteredInterface;
  status: InterfaceStatus;
  detail: string;
  errorMessage?: string;
  capturedAt?: number;
  sizeBytes?: number;
}

export interface CaptureQueueStats {
  discovered: number;
  captured: number;
  successful: number;
  failed: number;
  pending: number;
}

export class SafeModeCaptureEngine {
  private isRunning = false;
  private isPaused = false;
  private offscreenContainer: HTMLDivElement | null = null;
  private listeners: Array<() => void> = [];

  public itemsState: InterfaceCaptureState[] = [];

  constructor() {
    this.initStates();
  }

  public initStates() {
    const checkpoint = new Set(getStoredCheckpoint());

    // Pull exclusively from the app's real interfaceRegistry
    this.itemsState = interfaceRegistry.map((item) => {
      const isAlreadySaved = checkpoint.has(item.id);
      return {
        item,
        status: isAlreadySaved ? 'done' : 'queued',
        detail: isAlreadySaved ? 'Captured successfully' : 'Queued...',
      };
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getStats(): CaptureQueueStats {
    let successful = 0;
    let failed = 0;
    let capturing = 0;
    let queued = 0;
    let pending = 0;

    for (const state of this.itemsState) {
      if (state.status === 'done') successful++;
      else if (state.status === 'failed') failed++;
      else if (state.status === 'capturing') capturing++;
      else if (state.status === 'queued') queued++;
      else if (state.status === 'pending') pending++;
    }

    const discovered = this.itemsState.length;
    const captured = successful + failed;
    const totalPending = queued + pending + capturing;

    return {
      discovered,
      captured,
      successful,
      failed,
      pending: totalPending,
    };
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public pause() {
    this.isPaused = true;
    this.isRunning = false;
    this.notify();
  }

  public stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.cleanupOffscreen();
    this.notify();
  }

  private ensureOffscreen(): HTMLDivElement {
    if (!this.offscreenContainer) {
      const el = document.createElement('div');
      el.id = 'axon-capture-sandbox';
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      el.style.top = '0px';
      el.style.width = '390px';
      el.style.height = '844px';
      el.style.zIndex = '-999';
      el.style.opacity = '1';
      el.style.pointerEvents = 'none';
      el.style.overflow = 'hidden';
      el.style.background = '#121315';
      document.body.appendChild(el);
      this.offscreenContainer = el;
    }
    return this.offscreenContainer;
  }

  private cleanupOffscreen() {
    if (this.offscreenContainer) {
      this.offscreenContainer.replaceChildren();
      if (this.offscreenContainer.parentNode) {
        this.offscreenContainer.parentNode.removeChild(this.offscreenContainer);
      }
      this.offscreenContainer = null;
    }
  }

  /**
   * Run capture strictly ONE AT A TIME with explicit memory freeing
   */
  public async startQueue(targetIds?: string[]): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;

    // Filter queue to items that are not yet done, or selected subset
    const queue = this.itemsState.filter((s) => {
      if (targetIds && targetIds.length > 0) {
        return targetIds.includes(s.item.id);
      }
      return s.status !== 'done';
    });

    // Mark remaining items in queue as pending/queued
    for (const qItem of queue) {
      if (qItem.status !== 'done') {
        qItem.status = 'queued';
        qItem.detail = 'Queued...';
      }
    }
    this.notify();

    const sandbox = this.ensureOffscreen();
    const totalCount = queue.length;
    let processedIndex = 0;

    for (const state of queue) {
      if (!this.isRunning || this.isPaused) {
        break;
      }

      processedIndex++;
      state.status = 'capturing';
      state.detail = `Capturing (${processedIndex}/${totalCount})...`;
      this.notify();

      let capturedBlob: Blob | null = null;

      try {
        // PRE-FLIGHT CHECK:
        // "Before any interface is added to the capture queue, run a pre-flight check
        // confirming it resolves to a real, currently-mounted component in the app.
        // If it doesn't resolve, mark it as unavailable/failed — never substitute a generated approximation."
        const preflightOk = state.item.preflightCheck();
        if (!preflightOk) {
          throw new Error('Preflight check failed: component does not resolve to a mounted app component');
        }

        // Step 1: Render interface into isolated offscreen container
        sandbox.replaceChildren();
        const rootContainer = document.createElement('div');
        rootContainer.style.width = '390px';
        rootContainer.style.height = '844px';
        rootContainer.style.overflow = 'hidden';
        sandbox.appendChild(rootContainer);

        // Mount React element using React 19 createRoot
        const { createRoot } = await import('react-dom/client');
        const reactRoot = createRoot(rootContainer);
        reactRoot.render(state.item.componentFactory());

        // Step 2: Wait for stable state (frame renders + fonts)
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 150)));
        if (document.fonts) {
          try {
            await document.fonts.ready;
          } catch {
            // fallback
          }
        }

        // Step 3: Capture image of real rendered pixels
        const capturePromise = htmlToImage.toBlob(rootContainer, {
          quality: 0.95,
          pixelRatio: 1.5,
          cacheBust: true,
          skipAutoScale: true,
          skipFonts: true,
        });

        // 8 second timeout safety
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Capture timed out')), 8000)
        );

        capturedBlob = (await Promise.race([capturePromise, timeoutPromise])) as Blob | null;

        // Step 4: Validate captured result
        if (!capturedBlob || capturedBlob.size < 500) {
          throw new Error('Validation failed: output image is empty or invalid');
        }

        // Step 5: Persist to storage
        await saveCapture(state.item.id, state.item.name, capturedBlob);

        // Update state
        state.status = 'done';
        state.detail = 'Captured successfully';
        state.sizeBytes = capturedBlob.size;
        state.capturedAt = Date.now();

        // Step 6: Explicitly release memory
        reactRoot.unmount();
      } catch (err: any) {
        // An isolated failure on one interface must not stop or crash the rest of the queue
        console.error(`Interface capture error on ${state.item.name}:`, err);
        state.status = 'failed';
        state.detail = 'Failed to capture';
        state.errorMessage = err.message || 'Capture failed';
      } finally {
        // Clean sandbox DOM
        sandbox.replaceChildren();
        // Explicitly release captured image from memory
        capturedBlob = null;
        // Yield execution so GC can reclaim resources
        await new Promise((resolve) => setTimeout(resolve, 60));
        this.notify();
      }
    }

    this.cleanupOffscreen();
    this.isRunning = false;
    this.isPaused = false;
    this.notify();
  }

  /**
   * Download individual or batch PNGs (supports selected targetIds)
   */
  public async downloadPNG(targetIds?: string[]): Promise<void> {
    if (targetIds && targetIds.length === 1) {
      const record = await getCapture(targetIds[0]);
      if (!record) return;
      const anchor = document.createElement('a');
      anchor.href = record.url;
      anchor.download = `axon-${targetIds[0]}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(record.url);
      return;
    }

    // Batch download captured images as ZIP
    let captures = await getAllCaptures();
    if (targetIds && targetIds.length > 0) {
      const idSet = new Set(targetIds);
      captures = captures.filter((c) => idSet.has(c.id));
    }

    if (captures.length === 0) return;

    const zip = new JSZip();
    for (const cap of captures) {
      zip.file(`axon-${cap.id}.png`, cap.blob);
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `axon-interfaces-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  /**
   * Download PDF document (single or combined; supports selected targetIds)
   */
  public async downloadPDF(targetIds?: string[]): Promise<void> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [450, 920],
    });

    let capturesToExport = await getAllCaptures();
    if (targetIds && targetIds.length > 0) {
      const idSet = new Set(targetIds);
      capturesToExport = capturesToExport.filter((c) => idSet.has(c.id));
    }

    if (capturesToExport.length === 0) return;

    for (let i = 0; i < capturesToExport.length; i++) {
      if (i > 0) {
        pdf.addPage([450, 920], 'portrait');
      }

      const cap = capturesToExport[i];
      const matchingItem = interfaceRegistry.find((item) => item.id === cap.id);

      // Dark background for PDF page matching AXON aesthetic
      pdf.setFillColor(18, 19, 21);
      pdf.rect(0, 0, 450, 920, 'F');

      // Title & Subtitle header
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(`AXON · ${cap.name}`, 30, 36);

      pdf.setTextColor(154, 155, 159);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(
        matchingItem ? matchingItem.description : 'Real live captured interface.',
        30,
        50
      );

      // Convert Blob to Data URL to render into PDF
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(cap.blob);
      });

      // Embed real image
      pdf.addImage(dataUrl, 'PNG', 30, 65, 390, 810);
    }

    const filename = targetIds && targetIds.length === 1
      ? `axon-${targetIds[0]}.pdf`
      : `axon-interfaces-combined-${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(filename);
  }

  /**
   * Copy List as text or Markdown
   */
  public copyListText(format: 'markdown' | 'text' | 'json'): string {
    if (format === 'markdown') {
      let md = `# AXON Real Interface Catalog\nTotal: ${interfaceRegistry.length} interfaces\n\n`;
      for (const item of interfaceRegistry) {
        const status = this.itemsState.find((s) => s.item.id === item.id)?.status || 'queued';
        md += `- **${item.name}** (${item.category}): ${item.description} [${status.toUpperCase()}]\n`;
      }
      return md;
    }
    if (format === 'json') {
      return JSON.stringify(
        interfaceRegistry.map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          description: i.description,
          status: this.itemsState.find((s) => s.item.id === i.id)?.status || 'queued',
        })),
        null,
        2
      );
    }
    return interfaceRegistry.map((i, idx) => `${idx + 1}. ${i.name} - ${i.description}`).join('\n');
  }
}

// Export singleton instance
export const captureEngine = new SafeModeCaptureEngine();
