import LoginForm from '@/components/features/auth/LoginForm';

export default function LoginPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
        Sign in to your account
      </h2>
      <LoginForm />
    </div>
  );
}
