'use client';

import { AppConfig } from '@/utils/AppConfig';

const FooterCopyright = () => (
  <div className="footer-copyright text-slate-600">
    © Copyright {new Date().getFullYear()} <br></br>
    {AppConfig.title}.

    <style jsx>
      {`
        .footer-copyright :global(a) {
          @apply text-primary-500;
        }

        .footer-copyright :global(a:hover) {
          @apply underline;
        }
      `}
    </style>
  </div>
);

export { FooterCopyright }; 