import { BrowserRouter } from 'react-router-dom';
import { DarkModeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@evoapi/design-system';
import ResetPassword from './ResetPassword';

export default function ResetPasswordEntry() {
  return <BrowserRouter><DarkModeProvider><ResetPassword /><Toaster /></DarkModeProvider></BrowserRouter>;
}
