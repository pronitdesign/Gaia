import type { DetailedHTMLProps, HTMLAttributes } from "react";

/* <laura-signature> — custom element, definido em public/laura-signature.js.
   React 18 não infere tipos de custom element: os atributos vão como string
   (size="16px", no-sync=""), não como boolean/number. */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "laura-signature": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        href?: string;
        size?: string;
        photo?: string;
        copyright?: string;
        "no-sync"?: string;
      };
    }
  }
}

export {};
