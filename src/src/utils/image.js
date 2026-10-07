// Reduce una imagen a un tamaño pequeño y la devuelve como texto (data URL),
// para guardarla directamente en la base de datos sin necesidad de Firebase Storage.

const MAX_FILE_BYTES = 8 * 1024 * 1024

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen.'))
    }
    img.src = url
  })
}

export async function fileToLogo(file, maxSize = 256) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Elige un archivo de imagen (PNG, JPG o WebP).')
  if (file.size > MAX_FILE_BYTES) throw new Error('La imagen pesa demasiado (máximo 8 MB).')

  const img = await loadImage(file)
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(img, 0, 0, w, h)

  let data = canvas.toDataURL('image/webp', 0.85)
  // Algunos navegadores no soportan WebP y devuelven PNG: se acepta, ya es pequeño.
  if (data.length > 400 * 1024) data = canvas.toDataURL('image/jpeg', 0.8)
  return data
}
