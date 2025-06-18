'use client';

import type { ReactNode } from 'react';
import { HeroActionButton } from '../button/HeroActionButton';

type IHeroAnalysisButtonProps = {
  title: ReactNode;
  description: string;
};

type IHeroAcademyButtonProps = {
  title: ReactNode;
  description: string;
};

const HeroAnalysisButton = (props: IHeroAnalysisButtonProps) => (
  <header className="text-center w-full">
    <HeroActionButton text="Experimente a Análise Laboratorial Avançada e os insights do Dr. Corvus" href="/analysis" className="" />
  </header>
);

const HeroAcademyButton = (props: IHeroAcademyButtonProps) => (
  <header className="text-center w-full">
    <HeroActionButton text="Experimente as ferramentas da Academia Clínica e aprimore seu raciocínio clínico" href="/academy" className="" />
  </header>
);

export { HeroAnalysisButton, HeroAcademyButton }; 