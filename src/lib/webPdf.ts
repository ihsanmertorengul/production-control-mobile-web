export async function downloadPdfOnWeb(html: string, filename: string) {
  if (typeof document === 'undefined') {
    throw new Error('PDF indirme yalnızca web ortamında kullanılabilir.');
  }

  const html2pdf = (await import('html2pdf.js')).default;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:816px',
    'height:1056px',
    'border:0',
    'pointer-events:none',
    'z-index:-2147483647',
    'background:#fff',
  ].join(';');
  document.body.appendChild(frame);

  try {
    const frameLoaded = new Promise<void>((resolve, reject) => {
      frame.onload = () => resolve();
      frame.onerror = () => reject(new Error('Rapor görünümü hazırlanamadı.'));
    });
    frame.srcdoc = html;
    await frameLoaded;

    const frameDocument = frame.contentDocument;
    if (!frameDocument?.body) throw new Error('Rapor içeriği oluşturulamadı.');
    await frameDocument.fonts?.ready;
    const reportStyles = Array.from(frameDocument.head.querySelectorAll('style'));
    reportStyles.reverse().forEach(style => {
      frameDocument.body.prepend(style.cloneNode(true));
    });
    frameDocument.body.style.width = '816px';
    frameDocument.body.style.margin = '0';
    frameDocument.body.style.backgroundColor = '#ffffff';
    frameDocument.body.style.color = '#172033';
    frameDocument.body.style.fontFamily = 'Arial, sans-serif';
    frameDocument.body.style.fontSize = '10px';
    frameDocument.body.style.lineHeight = '1.45';
    frame.style.height = `${Math.max(1056, frameDocument.documentElement.scrollHeight)}px`;

    await html2pdf()
      .set({
        filename,
        margin: 0,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: 816,
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      })
      .from(frameDocument.body)
      .save();
  } finally {
    frame.remove();
  }
}
