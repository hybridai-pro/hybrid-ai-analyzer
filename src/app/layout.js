export const metadata = {
  title: 'HYBRID AI Stock Analyzer',
  description: 'Analisi fondamentale algoritmica powered by Hybrid AI',
}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body style={{margin:0,padding:0,background:'#03070F'}}>{children}</body>
    </html>
  )
}
