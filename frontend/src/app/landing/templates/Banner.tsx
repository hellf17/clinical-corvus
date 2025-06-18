'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { GradientAnimatedButton } from '../button/GradientAnimatedButton';
import { CTABanner } from '../cta/CTABanner';
import { Section } from '../layout/Section';
import { useEffect, useState } from 'react';

const Banner = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [targetHref, setTargetHref] = useState('/sign-up');
  const [buttonText, setButtonText] = useState('Comece Sua Jornada');

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn && user) {
        // User is logged in, redirect to appropriate dashboard
        const userRole = user.publicMetadata?.role as string | undefined;
        
        if (userRole === 'doctor') {
          setTargetHref('/dashboard-doctor');
          setButtonText('Acessar Dashboard');
        } else if (userRole === 'patient') {
          setTargetHref('/dashboard-patient');
          setButtonText('Acessar Dashboard');
        } else {
          // Role not set yet, go to choose-role
          setTargetHref('/choose-role');
          setButtonText('Escolher Perfil');
        }
      } else {
        // User not logged in, go to sign-up
        setTargetHref('/sign-up');
        setButtonText('Comece Sua Jornada');
      }
    }
  }, [isSignedIn, isLoaded, user]);

  return (
    <Section yPadding="py-0">
      <CTABanner
        title="Pronto para transformar sua prática e acelerar seu desenvolvimento como profissional de excelência?"
        subtitle="Junte-se à geração de profissionais potencializados por IA com Clinical Corvus."
        button={
          <GradientAnimatedButton text={buttonText} href={targetHref} />
        }
      />
    </Section>
  );
};

export { Banner }; 