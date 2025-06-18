import { SignUp } from "@clerk/nextjs";
import React from 'react';

export default function Page() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <SignUp path="/sign-up" />
    </div>
  );
}
