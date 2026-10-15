export function localPreviewEnabled() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.SONLUZ_LOCAL_PREVIEW === '1'
  );
}
