'use client';

import Link from 'next/link';
import React from 'react';

type IGradientAnimatedButtonProps = {
  text: string;
  href: string;
  className?: string;
};

const GradientAnimatedButton: React.FC<IGradientAnimatedButtonProps> = ({ text, href, className }) => {
  return (
    <Link href={href} className={`relative group ${className || ''}`}>
      <div className="relative w-56 h-20 opacity-90 overflow-hidden rounded-xl bg-neutral-900 z-10">
        <div
          className="absolute z-10 -translate-x-44 group-hover:translate-x-[30rem] ease-in transition-all duration-700 h-full w-44 bg-gradient-to-r from-neutral-400 to-white/10 opacity-30 -skew-x-12"
        ></div>

        <div
          className="absolute flex items-center justify-center text-white z-[1] opacity-90 rounded-xl inset-0.5 bg-neutral-800"
        >
          <span
            className="text-center font-semibold text-lg h-full opacity-90 w-full px-2 py-2 inline-flex items-center justify-center"
          >
            {text}
          </span>
        </div>
        <div
          className="absolute duration-1000 group-hover:animate-spin w-full h-[100px] bg-gradient-to-r from-primary to-secondary blur-[30px]"
        ></div>
      </div>
    </Link>
  );
};

export { GradientAnimatedButton }; 