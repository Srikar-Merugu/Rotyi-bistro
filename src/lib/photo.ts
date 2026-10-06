/** Crop hint for Unsplash URLs; other hosts (Supabase uploads) are resized by next/image alone. */
export function photoUrl(src: string, w: number, h: number) {
  return src.startsWith("https://images.unsplash.com/") ? `${src}?w=${w}&h=${h}&fit=crop` : src;
}
