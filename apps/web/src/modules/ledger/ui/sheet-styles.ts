export const GRILLA =
  "grid min-w-[1420px] grid-cols-[36px_88px_78px_132px_150px_112px_minmax(160px,1fr)_minmax(200px,1.4fr)_64px_100px_100px_72px_58px_70px]";

export const CELDA = "flex h-10 min-w-0 items-center overflow-hidden text-ellipsis whitespace-nowrap border-r border-border/70 px-2 text-xs";

export const CELDA_SIN_RELLENO = "flex h-10 min-w-0 items-center border-r border-border/70 p-0 text-xs";

export const ENTRADA =
  "h-full w-full min-w-0 border-0 bg-transparent px-2 text-xs text-foreground outline-none [color-scheme:dark] focus:bg-accent focus:shadow-[inset_0_0_0_2px_hsl(var(--primary))]";

export const ENTRADA_NUMERO = `${ENTRADA} text-right tabular-nums`;

export const MARCA_ERROR = "shadow-[inset_0_0_0_1px_hsl(var(--destructive))]";
export const MARCA_AVISO = "shadow-[inset_0_0_0_1px_hsl(45_90%_55%)]";
