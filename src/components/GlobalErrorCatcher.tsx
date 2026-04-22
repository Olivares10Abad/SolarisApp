import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLocation } from 'react-router-dom';

export default function GlobalErrorCatcher() {
    const location = useLocation();

    useEffect(() => {
        const reportErrorToSupabase = async (
            mensaje: string, 
            origen?: string, 
            linea?: string | number, 
            columna?: string | number, 
            stack_trace?: string,
            tipo_error: string = 'RUNTIME'
        ) => {
            try {
                // Obtenemos el usuario activo
                const sessionData = localStorage.getItem('session_gea_solar');
                const user = sessionData ? JSON.parse(sessionData) : null;

                // Evitar guardar errores de extensiones de navegador que ensucian el log
                if (origen && origen.includes('chrome-extension://')) return;
                if (mensaje.includes('ResizeObserver')) return;

                await supabase.from('system_errors').insert([{
                    mensaje: String(mensaje).substring(0, 500),
                    origen: origen ? String(origen).substring(0, 200) : window.location.href,
                    linea: linea ? String(linea) : null,
                    columna: columna ? String(columna) : null,
                    stack_trace: stack_trace ? String(stack_trace).substring(0, 1500) : null,
                    url_actual: window.location.href,
                    usuario_id: user?.id || null,
                    tipo_error: tipo_error
                }]);
            } catch (err) {
                // Evitamos loop infinito si Supabase falla
            }
        };

        // 1. Interceptar Errores de Runtime (window.onerror)
        const originalOnError = window.onerror;
        window.onerror = function (msg, url, lineNo, columnNo, error) {
            reportErrorToSupabase(
                typeof msg === 'string' ? msg : 'Error desconocido', 
                url, 
                lineNo, 
                columnNo, 
                error?.stack,
                'WINDOW_ERROR'
            );
            if (originalOnError) return originalOnError(msg, url, lineNo, columnNo, error);
            return false;
        };

        // 2. Interceptar Promesas Rechazadas (Unhandled Rejections)
        const onUnhandledRejection = (event: PromiseRejectionEvent) => {
            let msg = 'Promesa rechazada';
            let stack = undefined;

            if (event.reason instanceof Error) {
                msg = event.reason.message;
                stack = event.reason.stack;
            } else if (typeof event.reason === 'string') {
                msg = event.reason;
            }

            reportErrorToSupabase(msg, undefined, undefined, undefined, stack, 'UNHANDLED_PROMISE');
        };
        window.addEventListener('unhandledrejection', onUnhandledRejection);

        // 3. Interceptar console.error
        const originalConsoleError = console.error;
        console.error = (...args: any[]) => {
            const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            
            // Filtramos errores de React DevTools o info inútil
            if (!msg.includes('Warning:')) {
                reportErrorToSupabase(msg, undefined, undefined, undefined, undefined, 'CONSOLE_ERROR');
            }
            
            originalConsoleError.apply(console, args);
        };

        return () => {
            window.onerror = originalOnError;
            window.removeEventListener('unhandledrejection', onUnhandledRejection);
            console.error = originalConsoleError;
        };
    }, [location.pathname]); // Remontar/reconfigurar si es necesario al cambiar de ruta, aunque con useEffect vacío bastaría, dejamos location para trackear url_actual frescamente.

    return null; // Componente invisible
}
