type PhotoRow = {
  id: string;
  order: number;
  is_primary: boolean;
  [key: string]: unknown;
};

export function reorderProfilePhotos<T extends PhotoRow>(
  rows: T[],
  from: number,
  to: number
) {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from > 5 ||
    to > 5 ||
    !rows.some((row) => row.order === from)
  ) {
    throw new Error("No se encontró la foto para mover.");
  }
  const reordered = rows.map((row) => ({
    ...row,
    order: row.order === from ? to : row.order === to ? from : row.order,
  }));
  const first = Math.min(...reordered.map((row) => row.order));
  return reordered.map((row) => ({ ...row, is_primary: row.order === first }));
}
