// Local PDF export: user data never leaves the browser for document conversion.
const encoder = new TextEncoder();
export function imagePdf(pages) {
  const chunks = [],
    offsets = [0];
  let length = 0;
  const append = (value) => {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id, value) => {
    offsets[id] = length;
    append(`${id} 0 obj\n${value}\nendobj\n`);
  };
  append('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(
    2,
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`,
  );
  pages.forEach((page, i) => {
    const id = 3 + i * 3,
      commands = 'q 595 0 0 842 0 0 cm /Image Do Q\n';
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Image ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`,
    );
    object(
      id + 1,
      `<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}endstream`,
    );
    offsets[id + 2] = length;
    append(
      `${id + 2} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`,
    );
    append(page.bytes);
    append('\nendstream\nendobj\n');
  });
  const start = length,
    count = 3 + pages.length * 3;
  append(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let id = 1; id < count; id++) append(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  append(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
  const output = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    output.set(chunk, at);
    at += chunk.length;
  }
  return output;
}

export function wrapText(context, value, width) {
  const result = [];
  let line = '';
  for (const word of String(value).split(/\s+/)) {
    const candidate = line ? line + ' ' + word : word;
    if (context.measureText(candidate).width <= width) {
      line = candidate;
      continue;
    }
    if (line) result.push(line);
    line = '';
    for (const character of word) {
      if (line && context.measureText(line + character).width > width) {
        result.push(line);
        line = '';
      }
      line += character;
    }
  }
  if (line) result.push(line);
  return result.length ? result : ['—'];
}

export async function createUsersPdf(
  users,
  { logo, createCanvas = () => document.createElement('canvas'), now = new Date() } = {},
) {
  const sheets = [];
  const date = (value) =>
    value
      ? new Date(value).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' })
      : 'Sin registro';
  const issued = date(now);
  let context, y;
  function sheet() {
    const canvas = createCanvas();
    canvas.width = 1190;
    canvas.height = 1684;
    context = canvas.getContext('2d');
    context.scale(2, 2);
    context.fillStyle = '#ffffff';
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
    context.font = 'bold 21px sans-serif';
    context.fillText('Usuarios registrados', 40, 138);
    context.fillStyle = '#637787';
    context.font = '9px sans-serif';
    context.fillText('Emitido: ' + issued + ' · Costa Rica', 40, 158);
    context.fillText('Total de administradores: ' + users.length, 40, 175);
    y = 199;
    sheets.push({ canvas, context });
  }
  sheet();
  for (const [index, user] of users.entries()) {
    context.font = 'bold 12px sans-serif';
    const name = wrapText(context, user.name || 'Sin nombre', 477);
    context.font = '10px sans-serif';
    const email = wrapText(context, user.email, 477);
    const height = 73 + name.length * 15 + email.length * 13;
    if (y + height > 775) sheet();
    context.fillStyle = '#f3f6f9';
    context.fillRect(40, y, 515, height);
    context.fillStyle = '#123e61';
    context.font = 'bold 12px sans-serif';
    name.forEach((line, i) => context.fillText(line, 54, y + 22 + i * 15));
    context.font = '9px sans-serif';
    context.fillText('Administrador', 54, y + 24 + name.length * 15);
    context.fillStyle = '#42586b';
    context.font = '10px sans-serif';
    const emailY = y + 40 + name.length * 15;
    email.forEach((line, i) => context.fillText(line, 54, emailY + i * 13));
    const datesY = emailY + email.length * 13 + 12;
    context.font = '8px sans-serif';
    context.fillText('Registrado: ' + date(user.created_at), 54, datesY);
    context.fillText('Último acceso: ' + date(user.last_login_at), 300, datesY);
    context.fillStyle = '#637787';
    context.font = '8px sans-serif';
    context.fillText(String(index + 1).padStart(2, '0'), 54, datesY + 15);
    y += height + 10;
  }
  if (!users.length) {
    context.fillStyle = '#637787';
    context.font = '11px sans-serif';
    context.fillText('No hay usuarios registrados.', 40, y + 20);
  }
  const pages = [];
  for (const [index, { canvas, context: c }] of sheets.entries()) {
    c.strokeStyle = '#dfe8ee';
    c.beginPath();
    c.moveTo(40, 796);
    c.lineTo(555, 796);
    c.stroke();
    c.fillStyle = '#637787';
    c.font = '8px sans-serif';
    c.fillText('ASEMUC · Control de usuarios · Uso administrativo', 40, 813);
    c.textAlign = 'right';
    c.fillText(`Página ${index + 1} de ${sheets.length}`, 555, 813);
    const raw = atob(canvas.toDataURL('image/jpeg', 0.94).split(',')[1]);
    pages.push({
      width: canvas.width,
      height: canvas.height,
      bytes: Uint8Array.from(raw, (c) => c.charCodeAt(0)),
    });
  }
  return imagePdf(pages);
}

export async function downloadUsersPdf(users) {
  const logo = new Image();
  logo.src = '/logo.jpg';
  await logo.decode();
  const bytes = await createUsersPdf(users, { logo });
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ASEMUC-usuarios-' + new Date().toISOString().slice(0, 10) + '.pdf';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
