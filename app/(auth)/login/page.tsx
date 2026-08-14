import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <div className="skeleton w-80 h-96 rounded-xl" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
