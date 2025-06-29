'use client';

import type { ReactNode } from 'react';

type ISectionProps = {
  title?: string;
  description?: string;
  yPadding?: string;
  children: ReactNode;
};

const Section = (props: ISectionProps) => (
  <div
    className={`mx-auto max-w-screen-lg px-3 ${
      props.yPadding ? props.yPadding : 'py-6'
    }`}
  >
    {(props.title || props.description) && (
      <div className="mb-6 text-center">
        {props.title && (
          <h2 className="text-3xl font-bold text-gray-200 mb-4">{props.title}</h2>
        )}
        {props.description && (
          <div className="text-center mt-4 text-xl leading-relaxed text-neutral-100 font-semibold">{props.description}</div>
        )}
      </div>
    )}
    {props.children}
  </div>
);

export { Section }; 