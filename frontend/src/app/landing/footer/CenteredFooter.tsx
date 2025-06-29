'use client';

import type { ReactNode } from 'react';

import { FooterCopyright } from './FooterCopyright';

type ICenteredFooterProps = {
  logo: ReactNode;
  iconList: ReactNode;
  children: ReactNode; // For the navigation links <li>
};

const CenteredFooter = (props: ICenteredFooterProps) => (
  <div className="text-center">
    {props.logo}

    <nav>
      <ul className="navbar mt-4 flex flex-row justify-center text-xl font-medium text-slate-700 hover:text-blue-700">
        {props.children}
      </ul>
    </nav>

    <div className="mt-4 flex justify-center">
      {/* Directly use the iconList prop which should be <FooterIconList>...</FooterIconList> from the parent */}
      {props.iconList}
    </div>

    <div className="mt-4 text-sm">
      <FooterCopyright />
    </div>

    <style jsx>
      {`
        .navbar :global(li) {
          @apply mx-4;
        }
      `}
    </style>
  </div>
);

export { CenteredFooter }; 