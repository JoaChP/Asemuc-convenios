import { imagePdf, wrapText, downloadPdf } from './users-pdf.js';
import { CONVENIO_FIELDS, ESTADOS } from './convenio-fields.js';

export async function createConveniosPdf(
  items,
  {
    logo,
    search = '',
    now = new Date(),
    createCanvas = () => document.createElement('canvas'),
    loadImage = async () => null,
  } = {},
) {
  const pages = [];
  let canvas,
    context,
    y,
    index = 0;
  const issued = now.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });
  function finish() {
    if (!canvas) return;
    context.strokeStyle = '#dfe8ee';
    context.beginPath();
    context.moveTo(40, 798);
    context.lineTo(555, 798);
    context.stroke();
    context.fillStyle = '#637787';
    context.font = '8px sans-serif';
    context.fillText('ASEMUC · Informe de convenios · Uso administrativo', 40, 815);
    context.textAlign = 'right';
    context.fillText('Página ' + (pages.length + 1), 555, 815);
    const bytes = atob(canvas.toDataURL('image/jpeg', 0.94).split(',')[1]);
    pages.push({
      width: canvas.width,
      height: canvas.height,
      bytes: Uint8Array.from(bytes, (char) => char.charCodeAt(0)),
    });
  }
  function sheet() {
    finish();
    canvas = createCanvas();
    canvas.width = 1190;
    canvas.height = 1684;
    context = canvas.getContext('2d');
    context.scale(2, 2);
    context.fillStyle = 'white';
    context.fillRect(0, 0, 595, 842);
    context.fillStyle = '#cb2434';
    context.fillRect(0, 0, 595, 5);
    if (logo) context.drawImage(logo, 40, 27, 125, 58);
    context.fillStyle = '#123e61';
    context.font = 'bold 18px sans-serif';
    context.fillText('ASEMUC', 190, 45);
    context.font = '9px sans-serif';
    context.fillText('Asociación Solidarista de Empleados de la', 190, 62);
    context.fillText('Municipalidad de Carrillo', 190, 76);
    context.strokeStyle = '#dfe8ee';
    context.beginPath();
    context.moveTo(40, 102);
    context.lineTo(555, 102);
    context.stroke();
    context.font = 'bold 20px sans-serif';
    context.fillText(search ? 'Convenios filtrados' : 'Todos los convenios', 40, 136);
    context.fillStyle = '#637787';
    context.font = '8px sans-serif';
    context.fillText('Emitido: ' + issued + ' · Costa Rica', 40, 155);
    context.fillText(`Total: ${items.length} · Convenio ${index + 1} de ${items.length}`, 40, 170);
    y = 193;
    if (search) {
      context.font = '8px sans-serif';
      for (const line of wrapText(context, 'Filtro aplicado: ' + search, 515)) {
        context.fillText(line, 40, y);
        y += 11;
      }
      y += 9;
    }
  }
  function text(value, bold = false) {
    context.font = (bold ? 'bold ' : '') + '9px sans-serif';
    const lines = String(value)
      .split(/\r?\n/)
      .flatMap((part) => wrapText(context, part, 515));
    for (const line of lines) {
      if (y > 774) sheet();
      context.font = (bold ? 'bold ' : '') + '9px sans-serif';
      context.fillStyle = bold ? '#123e61' : '#354f64';
      context.fillText(line, 40, y);
      y += 13;
    }
  }
  for (const [i, record] of items.entries()) {
    index = i;
    sheet();
    if (record.logo) {
      let picture;
      try {
        picture = await loadImage(record.logo);
      } catch {
        /* Keep the complete text if an image is unavailable. */
      }
      if (picture) {
        const ratio = Math.min(120 / picture.width, 65 / picture.height);
        context.drawImage(picture, 40, y, picture.width * ratio, picture.height * ratio);
        y += 80;
      } else {
        text('Imagen: no disponible');
        y += 8;
      }
    }
    for (const [field, metadata] of Object.entries(CONVENIO_FIELDS)) {
      if (y > 743) sheet();
      text(metadata.label, true);
      text(
        field === 'estado'
          ? ESTADOS[record[field]] || record[field] || 'No informado'
          : record[field] || 'No informado',
      );
      y += 8;
    }
    text('Identificador del convenio', true);
    text(record.id || 'No informado');
    y += 8;
    text('Última actualización', true);
    text(
      record.updated_at
        ? new Date(record.updated_at).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' })
        : 'No informado',
    );
  }
  finish();
  return imagePdf(pages);
}

export async function downloadConveniosPdf(items, options = {}) {
  const loadImage = async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    return image;
  };
  const logo = await loadImage('/logo.jpg');
  const bytes = await createConveniosPdf(items, { ...options, logo, loadImage });
  downloadPdf(bytes, options.search ? 'convenios-filtrados' : 'convenios');
}
