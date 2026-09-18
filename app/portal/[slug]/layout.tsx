export const metadata = {
  title: 'Portal do Cliente — APR Digital',
  description: 'Acompanhe relatórios, tarefas e lançamentos do seu projeto.',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
