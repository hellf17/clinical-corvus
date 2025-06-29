'use client';

import React from 'react';
import { Section } from '../layout/Section';

const VisionSection = () => (
  <Section yPadding="py-6">
    <div className="mx-auto">
      <h2 className="text-3xl text-center font-semibold text-secondary-foreground mb-6">Por que Clinical Corvus?</h2>
      <p className="text-center mt-4 text-xl leading-relaxed text-neutral-100">
        Acreditamos que o conhecimento médico, o desenvolvimento de um raciocínio clínico robusto e o acesso a ferramentas de análise de ponta devem caminhar juntos. 
        Dr. Corvus conecta a expertise médica e as mais recentes evidências científicas com as necessidades de aprendizado de futuros profissionais e a otimização da prática de médicos estabelecidos, 
        criando um ecossistema de saúde mais inteligente, educacional e tecnologicamente avançado.
      </p>
    </div>
  </Section>
);

export { VisionSection }; 