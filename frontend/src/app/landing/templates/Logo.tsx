'use client';

import Image from 'next/image';

type ILogoProps = {
  xl?: boolean;
};

const Logo = (props: ILogoProps) => {
  const imageSize = props.xl ? 44 : 32;
  const fontStyle = props.xl
    ? 'font-semibold text-3xl'
    : 'font-semibold text-xl';

  return (
    <span className={`inline-flex items-center text-slate-800 ${fontStyle}`}>
      <Image
        src="/Icon.png"
        alt="Clinical Corvus logo"
        width={imageSize}
        height={imageSize}
        className="mr-2 rounded-full object-cover"
      />
      Clinical Corvus
    </span>
  );
};

export { Logo }; 