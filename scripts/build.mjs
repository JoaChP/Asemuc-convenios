if (process.env.DATABASE_URL) {
  await import('./setup.mjs');
} else {
  console.log('Sin DATABASE_URL: desplegando interfaz, pendiente de conexión Neon.');
}
