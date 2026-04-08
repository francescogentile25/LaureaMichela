/** Genera una coppia di colori (background, testo) univoca dal nome */
export function avatarColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  const bg = `hsl(${hue}, 55%, 88%)`;
  const text = `hsl(${hue}, 50%, 35%)`;

  return { bg, text };
}
