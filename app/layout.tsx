import './globals.css';

export const metadata = {
  title: 'Ana Paula Romano — Sistema de Gestão',
  description: 'APR Digital — Hub de Gestão de Agência',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
