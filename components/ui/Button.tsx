import type { ReactNode } from 'react';
import { Magnetic } from './Magnetic';

type Props = { href: string; children: ReactNode; variant?: 'primary' | 'secondary' };

export function Button({ href, children, variant = 'primary' }: Props) {
  return (
    <Magnetic>
      <a href={href} className={`btn btn-${variant}`} data-cursor="hover">
        {children}
      </a>
    </Magnetic>
  );
}
