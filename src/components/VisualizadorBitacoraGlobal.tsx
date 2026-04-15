import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ModalLineaTiempo from './ModalLineaTiempo'

export default function VisualizadorBitacoraGlobal({ proyectoId, onClose, usuarioLogueado }: any) {
    const [logs, setLogs] = useState<any[]>([])
    const [proyecto, setProyecto] = useState<any>(null)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        if (!proyectoId) return

        const fetchDatos = async () => {
            setCargando(true)
            // Cargar datos del proyecto
            const { data: pData } = await supabase
                .from('proyectos')
                .select('*')
                .eq('id', proyectoId)
                .single()
            if (pData) setProyecto(pData)

            // Cargar logs (bitácora)
            const { data: lData } = await supabase
                .from('proyectos_interacciones')
                .select(`
                    id, accion, created_at, estado_nuevo, mensaje,
                    perfiles:usuario_id (nombre, apellidos)
                `)
                .eq('proyecto_id', proyectoId)
                .order('created_at', { ascending: false })
            if (lData) setLogs(lData)

            setCargando(false)
        }

        fetchDatos()
    }, [proyectoId])

    if (!proyectoId) return null;

    if (cargando) {
        return (
            <div className="fixed inset-0 z-[1055] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-bold text-slate-700">Cargando bitácora universal...</span>
                </div>
            </div>
        )
    }

    return (
        <ModalLineaTiempo 
            logs={logs} 
            proyecto={proyecto} 
            onClose={onClose} 
            // Omitimos onAbrirChatFase para mantenerlo como solo visualizador global
        />
    )
}
