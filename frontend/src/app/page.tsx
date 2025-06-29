'use client';

import { AppConfig } from '@/utils/AppConfig';
// import { Meta } from '../layout/Meta'; // Temporarily commented out
import { Banner } from './landing/templates/Banner';
import { Footer } from './landing/templates/Footer';
import { Hero } from './landing/templates/Hero';
import { VerticalFeatures } from './landing/templates/VerticalFeatures';
import { DualPerspectiveSection } from './landing/feature/DualPerspectiveSection';
import { VisionSection } from './landing/feature/VisionSection';
import { TechnologyHighlight } from './landing/feature/TechnologyHighlight'; // Activated technology showcase

const Base = () => (
  <div className="text-slate-800 antialiased"> {/* Ensure Tailwind is set up for these base styles */}
    {/* <Meta title={AppConfig.title} description={AppConfig.description} /> */}
    <Hero />
    <DualPerspectiveSection />
    <VerticalFeatures />
    <TechnologyHighlight /> {/* Technology showcase now active */}
    <VisionSection />
    <Banner />
    <Footer />
  </div>
);

export default Base;