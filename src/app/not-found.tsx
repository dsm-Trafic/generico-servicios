import Link from 'next/link';

export default function NotFound(){
 return <main className="login card"><h1>No disponible</h1><p>El registro no existe o no tienes permiso para verlo.</p><Link className="button" href="/">Volver al inicio</Link></main>;
}
