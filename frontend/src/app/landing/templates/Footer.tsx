'use client';

import Link from 'next/link';
import { Github, Twitter, Mail } from 'lucide-react';

import { Background } from '../background/Background';
import { CenteredFooter } from '../footer/CenteredFooter';
import { Section } from '../layout/Section';
import { Logo } from './Logo';

const Footer = () => (
  <Background color="bg-transparent">
    <Section>
      <CenteredFooter
        logo={<Logo />}
        iconList={
          <div className="card_social_buttons">
            <a href="https://github.com/hellf17/clinical-corvus" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="socialContainer containerGithub">
              <Github className="socialSvg" />
            </a>
            <a href="https://twitter.com/ClinicalCorvus" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="socialContainer containerTwitter">
              <Twitter className="socialSvg" />
            </a>
            <a href="mailto:contact@drcorvus.app" aria-label="Email" className="socialContainer containerMail">
              <Mail className="socialSvg" />
            </a>
          </div>
        }
      >
        <li className="mx-2"><Link href="/">Início</Link></li>
        <li className="mx-2"><Link href="/about">Sobre</Link></li>
        <li className="mx-2"><Link href="/features">Funcionalidades</Link></li>
        <li className="mx-2"><Link href="/contact">Contato</Link></li>
        <li className="mx-2"><Link href="/terms">Termos de Uso</Link></li>
        <li className="mx-2"><Link href="/privacy">Política de Privacidade</Link></li>
        <li className="mx-2"><Link href="/cookies">Cookies</Link></li>
      </CenteredFooter>
    </Section>
  </Background>
);

export { Footer }; 