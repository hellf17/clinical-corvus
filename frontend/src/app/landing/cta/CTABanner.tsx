'use client';

import type { ReactNode } from 'react';

type ICTABannerProps = {
  title: string;
  subtitle: string;
  button: ReactNode;
};

const CTABanner = (props: ICTABannerProps) => (
  <div className="flex flex-col rounded-md bg-primary-100 p-4 text-left sm:flex-row sm:items-center sm:justify-between sm:p-10 sm:text-left">
    <div className="font-semibold">
      <div className="text-foreground text-xl font-semibold mb-2">{props.title}</div>
      <div className="text-neutral-100 text-lg leading-relaxed">{props.subtitle}</div>
    </div>

    <div className="whitespace-no-wrap mt-3 sm:ml-2 sm:mt-0">
      {props.button}
    </div>
  </div>
);

export { CTABanner }; 