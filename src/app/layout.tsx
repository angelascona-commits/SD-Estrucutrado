import '@/app/globals.css';

export const metadata = {
  title: 'Service Desk',
  description: 'Sistema de gestión de incidencias',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Dejamos el children solo para que el Login se vea a pantalla completa */}
        {children}
      </body>
    </html>
  );
}