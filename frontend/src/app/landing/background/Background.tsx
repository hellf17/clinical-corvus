'use client';

import type { ReactNode } from 'react';

type IBackgroundProps = {
  children: ReactNode;
  color: string; // Expecting a Tailwind CSS background color class e.g., "bg-gray-100"
};

const Background = (props: IBackgroundProps) => (
  <div className={props.color}>{props.children}</div>
);

export { Background }; 