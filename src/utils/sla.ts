export const calcularHorasHabilesSLA = (inicioIso: string, finIso: string = new Date().toISOString()): number => {
    let inicio = new Date(inicioIso);
    let fin = new Date(finIso);

    if (inicio >= fin) return 0;

    let horasHabiles = 0;
    
    // Clonamos la fecha de inicio para iterar
    let actual = new Date(inicio.getTime());

    while (actual < fin) {
        const diaSemana = actual.getDay();
        // Lunes (1) a Viernes (5)
        if (diaSemana >= 1 && diaSemana <= 5) {
            const hora = actual.getHours();
            // Horario laboral: 9:00 a 18:00 (6:00 PM)
            if (hora >= 9 && hora < 18) {
                // Si la misma hora cae dentro, sumamos la fracción.
                // Usamos incrementos de 1 minuto para mayor precisión.
                horasHabiles += (1 / 60);
            }
        }
        // Avanzar 1 minuto
        actual.setMinutes(actual.getMinutes() + 1);
    }

    return parseFloat(horasHabiles.toFixed(2));
}

export const getEstiloSLA = (horas: number) => {
    if (horas <= 48) {
        return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', tag: 'VERDE', msj: 'Dentro del SLA' };
    } else if (horas <= 72) {
        return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', tag: 'AMARILLO', msj: 'Alerta / Precaución' };
    } else {
        return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', tag: 'ROJO', msj: 'SLA Incumplido' };
    }
}
