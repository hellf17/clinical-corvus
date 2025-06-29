'use client';

import Link from 'next/link';
import React from 'react';

type IHeroActionButtonProps = {
  text: string;
  href: string;
  className?: string; // Allow passing additional Tailwind classes
};

const HeroActionButton: React.FC<IHeroActionButtonProps> = ({ text, href, className }) => {
  return (
    <Link href={href} className={`btn ${className || ''}`}>
      <div className="w-full">{text}</div>
    </Link>
  );
};

export { HeroActionButton }; 