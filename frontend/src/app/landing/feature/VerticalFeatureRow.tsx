'use client';

import Image from 'next/image'; // Import next/image

type IVerticalFeatureRowProps = {
  title: string;
  generalDescription: string;
  doctorDescription?: string;
  patientDescription?: string; // Keep for backward compatibility but won't display
  studentDescription?: string;
  image: string;
  imageAlt: string;
  reverse?: boolean;
};

const VerticalFeatureRow = (props: IVerticalFeatureRowProps) => {
  const baseClasses = 'mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 items-center';
  
  return (
    <div className="mt-8">
      {/* Title spanning full width */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-semibold text-secondary-foreground">{props.title}</h3>
      </div>
      
      {/* Content Grid */}
      <div className={baseClasses}>
        {/* Text Content Div */}
        <div className={`sm:text-left sm:px-6 ${props.reverse ? 'sm:order-last' : ''}`}>
          <div className="text-xl leading-relaxed text-neutral-100 mb-6">{props.generalDescription}</div>
          
          {props.studentDescription && (
            <div className="mt-6">
              <h4 className="text-xl font-semibold text-secondary-foreground mb-3 flex items-center">
                <span className="text-2xl mr-2">📚</span>
                Para Estudantes & Residentes
              </h4>
              <p className="text-lg leading-relaxed text-neutral-100">{props.studentDescription}</p>
            </div>
          )}
          
          {props.doctorDescription && (
            <div className="mt-6">
              <h4 className="text-xl font-semibold text-secondary-foreground mb-3 flex items-center">
                <span className="text-2xl mr-2">🩺</span>
                Para Profissionais
              </h4>
              <p className="text-lg leading-relaxed text-neutral-100">{props.doctorDescription}</p>
            </div>
          )}

          {/* Patient description removed - no longer displayed */}
        </div>

        {/* Image Content Div */}
        <div className={`p-6 min-h-[256px] relative ${props.reverse ? 'sm:order-first' : ''}`}>
          <Image
            src={props.image.startsWith('/') ? props.image : `/${props.image}`}
            alt={props.imageAlt}
            fill
            style={{ objectFit: 'contain' }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      </div>
    </div>
  );
};

export { VerticalFeatureRow }; 