import { redirect } from 'next/navigation';

// Root redirects to /home — middleware handles auth, redirects unauthed to /login
export default function RootPage() {
  redirect('/home');
}
