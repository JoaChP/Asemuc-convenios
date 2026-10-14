export const CONVENIO_FIELDS = {
  nombre: { label: 'Nombre de la empresa', required: true },
  categoria: { label: 'Categoría', required: true },
  ubicacion: { label: 'Ubicación' },
  direccion: { label: 'Dirección exacta', type: 'textarea' },
  telefono: { label: 'Teléfono', type: 'tel' },
  whatsapp: { label: 'WhatsApp con código de país', type: 'tel' },
  correo: { label: 'Correo electrónico', type: 'email' },
  sitio: { label: 'Sitio web', type: 'url' },
  descripcion: { label: 'Descripción', type: 'textarea', wide: true },
  beneficio: { label: 'Beneficio para asociados', type: 'textarea', required: true, wide: true },
  condiciones: { label: 'Requisitos y condiciones', type: 'textarea', wide: true },
  estado: { label: 'Estado', type: 'select' },
  inicio: { label: 'Fecha de inicio', type: 'date' },
  fin: { label: 'Fecha de vencimiento', type: 'date' },
};
export const ESTADOS = {
  borrador: 'Borrador',
  vigente: 'Publicado',
  vencido: 'Vencido',
  prospecto: 'En revisión',
};
export const MAX_IMAGE_BYTES = 1048576;
export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
