/** Tamaños (DESIGN_SYSTEM.md §3.8). */
export const iconSize = { sm: 16, md: 20, lg: 24, xl: 32 } as const;
export const touchTarget = 44;
export const avatarSize = { sm: 32, md: 48, lg: 88 } as const;

export const sizes = { iconSize, touchTarget, avatarSize } as const;
export type IconSizeToken = keyof typeof iconSize;
