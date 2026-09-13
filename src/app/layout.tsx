import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Genérico Servicios', template: '%s · Genérico Servicios' },
  description: 'Gestión local de clientes, citas, trabajos, visitas y cobros.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
